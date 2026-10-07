#!/usr/bin/env python3
"""
SecLab Terminal — реальный backend для prototype/terminal-lab.html.

Никаких сторонних зависимостей: только стандартная библиотека Python.

Что делает:
  - Отдаёт prototype/terminal-lab.html на "/"
  - POST /api/login   {studentId, password} -> проверяет основной пароль студента
        (users.password_hash/salt, scrypt — как в mdtask). Пароль задания №3
        для входа не подходит: он открывает защищённую базу (см. ниже)
  - POST /api/run     {cmd} -> выполняет команду терминала (ls/cd/pwd/cat/find/
        whoami/id/date/echo/clear/help) в песочнице этого студента на диске
        (mdtask/data/ctf/caesar/<id>/ — та же, что уже сгенерирована
        ctf/caesar-secret/generate_challenge.py, ничего не дублируется)
  - POST /api/logout  -> завершает сессию

Команда `sqlite3` переключает сессию в интерактивный режим SQLite
(см. sqlite_shell.py): дальнейшие строки уходят в него, пока не будет .quit.
Для защищённой базы задания №3 сначала запрашивается пароль; успешное
открытие отмечает задание решённым (ctf_caesar_secrets.solved=1).

Сессии — в памяти процесса (cookie sid), этого достаточно для одного
учебного сервера; не переживает перезапуск процесса.

Запуск:
    python3 server/app.py
    (порт 8088 по умолчанию, переопределяется переменной PORT)
"""

import hashlib
import http.server
import json
import os
import secrets
import socketserver
import sqlite3
import time
from http import cookies
from pathlib import Path
from urllib.parse import urlparse

import sqlite_shell

# Корень репозитория mdtask (этот каталог — mdtask/ib/server).
REPO_ROOT = Path(__file__).resolve().parents[2]
MDTASK_DB = os.environ.get("MDTASK_DB", str(REPO_ROOT / "data" / "mdtask.db"))
CTF_CAESAR_DIR = Path(os.environ.get("CTF_CAESAR_DIR", str(REPO_ROOT / "data" / "ctf" / "caesar")))
STATIC_DIR = Path(__file__).resolve().parent.parent / "prototype"
PORT = int(os.environ.get("PORT", 8088))

SESSIONS = {}  # sid -> {"student_id": str, "cwd": str, "sqlite": SqliteShell | PasswordPrompt | None}
MAX_CMD_LEN = 4000

HELP_TEXT = """Доступные команды:
  ls [-a] [путь]   - показать содержимое каталога (-a - включая скрытые файлы)
  cd [путь]        - перейти в каталог
  pwd              - показать текущий каталог
  cat <файл>       - показать содержимое файла
  find [путь]      - показать все файлы рекурсивно, включая скрытые
  whoami           - показать текущего пользователя
  id               - показать uid/gid текущего пользователя
  date             - показать текущую дату и время
  echo <текст>     - вывести текст
  sqlite3 [файл]   - работа с базой данных SQLite (внутри: .help, .tables, .quit)
  clear            - очистить экран
  logout           - выйти из системы
  help             - эта справка"""


# ---------------------------------------------------------------- пароли ---

def verify_scrypt(password, hash_hex, salt_str):
    """Повторяет src/lib/password.js mdtask: scryptSync(password, salt, 64),
    где salt передаётся как обычная строка (её UTF-8 байты), а не hex-декод."""
    if not hash_hex or not salt_str:
        return False
    dk = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt_str.encode("utf-8"),
        n=16384, r=8, p=1, dklen=64, maxmem=64 * 1024 * 1024,
    )
    return secrets.compare_digest(dk.hex(), hash_hex)


def db_connect():
    conn = sqlite3.connect(MDTASK_DB)
    conn.row_factory = sqlite3.Row
    return conn


def verify_login(student_id, password):
    conn = db_connect()
    try:
        user = conn.execute("SELECT * FROM users WHERE id=?", (student_id,)).fetchone()
        return bool(user) and verify_scrypt(password, user["password_hash"], user["password_salt"])
    finally:
        conn.close()


def mark_solved(student_id):
    conn = db_connect()
    try:
        conn.execute(
            "UPDATE ctf_caesar_secrets SET solved=1, solved_at=? WHERE student_id=? AND solved=0",
            (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), student_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_solved(student_id):
    conn = db_connect()
    try:
        row = conn.execute(
            "SELECT solved FROM ctf_caesar_secrets WHERE student_id=?", (student_id,)
        ).fetchone()
        return bool(row["solved"]) if row else False
    finally:
        conn.close()


# --------------------------------------------------------- файловая система ---

def sandbox_root(student_id):
    return CTF_CAESAR_DIR / student_id


def prompt_path(cwd_rel):
    return f"~/{cwd_rel}" if cwd_rel else "~"


def shell_prompt(session):
    if session.get("sqlite"):
        return session["sqlite"].prompt
    return f"{session['student_id']}@seclab:{prompt_path(session['cwd'])}$ "


def input_mode(session):
    state = session.get("sqlite")
    if isinstance(state, sqlite_shell.PasswordPrompt):
        return "password"
    return "sqlite" if state else "shell"


def resolve_in_sandbox(root: Path, cwd_abs: Path, arg: str):
    rel = (arg or ".").strip()
    if rel == "~":
        rel = "."
    elif rel.startswith("~/"):
        rel = rel[2:]
    base = root if rel.startswith("/") else cwd_abs
    rel = rel.lstrip("/")
    target = (base / rel).resolve() if rel else base.resolve()
    root_resolved = root.resolve()
    try:
        target.relative_to(root_resolved)
    except ValueError:
        if target != root_resolved:
            return None
    return target


def list_recursive(showAll, dir_path: Path, prefix: str, out: list):
    try:
        entries = sorted(os.listdir(dir_path))
    except OSError:
        return
    for entry in entries:
        if not showAll and entry.startswith("."):
            continue
        full = dir_path / entry
        rel = f"{prefix}/{entry}" if prefix else entry
        is_dir = full.is_dir()
        out.append(rel + ("/" if is_dir else ""))
        if is_dir:
            list_recursive(showAll, full, rel, out)


def run_command(student_id, cwd_rel, line):
    root = sandbox_root(student_id)
    cwd_abs = root / (cwd_rel or "")
    parts = line.strip().split()
    cmd = parts[0] if parts else ""
    rest = parts[1:]
    raw_args = line.strip()[len(cmd):].strip()

    if cmd == "":
        return "", cwd_rel
    if cmd == "help":
        return HELP_TEXT, cwd_rel
    if cmd == "whoami":
        return student_id, cwd_rel
    if cmd == "id":
        return f"uid=1000({student_id}) gid=1000({student_id}) группы=1000({student_id})", cwd_rel
    if cmd == "date":
        return time.strftime("%a %b %d %Y %H:%M:%S GMT%z"), cwd_rel
    if cmd == "echo":
        return raw_args, cwd_rel
    if cmd == "pwd":
        return f"/home/{student_id}/{cwd_rel}".rstrip("/"), cwd_rel
    if cmd == "clear":
        return "__CLEAR__", cwd_rel

    if cmd == "cd":
        arg = rest[0] if rest else None
        if not arg or arg == "~":
            return "", ""
        target = resolve_in_sandbox(root, cwd_abs, arg)
        if target is None:
            return "cd: доступ за пределы домашнего каталога запрещён", cwd_rel
        if not target.exists():
            return f"cd: {arg}: нет такого файла или каталога", cwd_rel
        if not target.is_dir():
            return f"cd: {arg}: это не каталог", cwd_rel
        new_rel = str(target.relative_to(root.resolve())) if target != root.resolve() else ""
        return "", ("" if new_rel == "." else new_rel)

    if cmd == "ls":
        show_all = "-a" in rest
        path_arg = next((a for a in rest if a != "-a"), None)
        target = resolve_in_sandbox(root, cwd_abs, path_arg)
        if target is None:
            return "ls: доступ за пределы домашнего каталога запрещён", cwd_rel
        if not target.exists():
            return f"ls: {path_arg or '.'}: нет такого файла или каталога", cwd_rel
        if not target.is_dir():
            return target.name, cwd_rel
        entries = sorted(os.listdir(target))
        entries = [e for e in entries if show_all or not e.startswith(".")]
        if not entries:
            return (". .." if show_all else "(пусто)"), cwd_rel
        formatted = [e + ("/" if (target / e).is_dir() else "") for e in entries]
        return "  ".join(formatted), cwd_rel

    if cmd == "find":
        path_arg = rest[0] if rest else None
        target = resolve_in_sandbox(root, cwd_abs, path_arg)
        if target is None:
            return "find: доступ за пределы домашнего каталога запрещён", cwd_rel
        if not target.exists():
            return f"find: {path_arg or '.'}: нет такого файла или каталога", cwd_rel
        out = ["."]
        if target.is_dir():
            list_recursive(True, target, "", out)
        else:
            out = [target.name]
        return "\n".join(out), cwd_rel

    if cmd == "cat":
        if not rest:
            return "cat: укажите файл", cwd_rel
        target = resolve_in_sandbox(root, cwd_abs, rest[0])
        if target is None:
            return "cat: доступ за пределы домашнего каталога запрещён", cwd_rel
        if not target.exists() or not target.is_file():
            return f"cat: {rest[0]}: нет такого файла", cwd_rel
        try:
            return target.read_text(encoding="utf-8"), cwd_rel
        except UnicodeDecodeError:
            return f"cat: {rest[0]}: двоичный файл", cwd_rel

    return f'{cmd}: команда не найдена. Наберите "help".', cwd_rel


def db_path_resolver(student_id, cwd_rel):
    """Резолвер путей к файлам БД для sqlite3 — только внутри песочницы."""
    root = sandbox_root(student_id)
    cwd_abs = root / (cwd_rel or "")

    def resolve(arg):
        target = resolve_in_sandbox(root, cwd_abs, arg)
        if target is None:
            raise sqlite_shell.ShellError("доступ за пределы домашнего каталога запрещён")
        if target.is_dir():
            raise sqlite_shell.ShellError(f"{arg}: это каталог")
        if not target.parent.is_dir():
            raise sqlite_shell.ShellError(f"{arg}: нет такого каталога")
        rel = target.relative_to(root.resolve())
        return str(target), f"/home/{student_id}/{rel}"

    return resolve


def run_line(session, line):
    """Выполняет строку ввода: в sqlite3, если он открыт, иначе в bash-эмуляторе."""
    state = session.get("sqlite")
    if isinstance(state, sqlite_shell.PasswordPrompt):
        output, session["sqlite"], unlocked = state.submit(line)
        if unlocked:
            mark_solved(session["student_id"])
        return output

    shell = state
    if shell:
        output, done = shell.feed(line)
        if done:
            shell.close()
            session["sqlite"] = None
        return output

    parts = line.strip().split(maxsplit=1)
    if parts and parts[0] in ("sqlite3", "SQLite3"):
        resolver = db_path_resolver(session["student_id"], session["cwd"])
        output, shell = sqlite_shell.start(parts[1] if len(parts) > 1 else "", resolver)
        session["sqlite"] = shell
        return output

    output, session["cwd"] = run_command(session["student_id"], session["cwd"], line)
    return output


def close_session(sid):
    session = SESSIONS.pop(sid, None)
    if session and isinstance(session.get("sqlite"), sqlite_shell.SqliteShell):
        session["sqlite"].close()


# ------------------------------------------------------------------- API ---
# Общая логика /api/* — её используют и HTTP-сервер ниже (Handler), и мост
# для mdtask (bridge.py), который вызывает её из Node-процесса.

def prompt_state(session):
    return {
        "nextPrompt": shell_prompt(session),
        "mode": input_mode(session),
    }


def handle_api(path, data, sid):
    """Обрабатывает POST /api/<...>.

    Возвращает (HTTP-статус, тело-JSON, new_sid): new_sid — sid новой сессии
    после входа, "" — сессию нужно забыть (выход), None — без изменений.
    """
    if path == "/api/login":
        student_id = (data.get("studentId") or "").strip()
        password = data.get("password") or ""
        if not verify_login(student_id, password):
            return 200, {"ok": False, "error": "Неверный логин или пароль"}, None
        return 200, {"ok": True, "studentId": student_id}, new_session(student_id)

    if not sid or sid not in SESSIONS:
        return 401, {"error": "not authenticated"}, None
    session = SESSIONS[sid]
    student_id = session["student_id"]

    if path == "/api/run":
        if data.get("interrupt"):
            # Ctrl+C: отменить ввод пароля или сбросить недописанное SQL-выражение
            state = session.get("sqlite")
            if isinstance(state, sqlite_shell.PasswordPrompt):
                session["sqlite"] = None
            elif state:
                state.interrupt()
            return 200, prompt_state(session), None
        line = (data.get("cmd") or "")[:MAX_CMD_LEN]
        prompt_before = shell_prompt(session)
        secret_input = input_mode(session) == "password"
        output = run_line(session, line)
        if secret_input:
            line = ""  # пароль не возвращаем и не показываем в логе
        if output == "__CLEAR__":
            return 200, {"clear": True, **prompt_state(session)}, None
        return 200, {
            "prompt": prompt_before,
            "cmd": line,
            "output": output,
            **prompt_state(session),
        }, None

    if path == "/api/logout":
        close_session(sid)
        return 200, {"ok": True}, ""

    if path == "/api/whoami":
        return 200, {
            "studentId": student_id,
            "solved": get_solved(student_id),
            **prompt_state(session),
        }, None

    return 404, {}, None


# ------------------------------------------------------------------- HTTP ---

def new_session(student_id):
    # Студенту без сгенерированного задания — пустой домашний каталог,
    # иначе любая команда падает с «нет такого файла или каталога».
    sandbox_root(student_id).mkdir(parents=True, exist_ok=True)
    sid = secrets.token_hex(24)
    SESSIONS[sid] = {"student_id": student_id, "cwd": "", "sqlite": None}
    return sid


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "SecLabTerminal/1.0"

    def log_message(self, fmt, *args):
        pass  # тише в консоли

    def _send_json(self, obj, status=200, set_cookie=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/prototype/terminal-lab.html"):
            self._serve_file(STATIC_DIR / "terminal-lab.html", "text/html; charset=utf-8")
            return
        if parsed.path in ("/admin", "/admin-panel", "/admin-panel/", "/admin-panel/index.html"):
            self._serve_file(
                STATIC_DIR.parent / "admin-panel" / "index.html", "text/html; charset=utf-8"
            )
            return
        self.send_response(404)
        self.end_headers()

    def _serve_file(self, path: Path, content_type):
        if not path.exists():
            self.send_response(404)
            self.end_headers()
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        parsed = urlparse(self.path)
        jar = cookies.SimpleCookie()
        if self.headers.get("Cookie"):
            jar.load(self.headers.get("Cookie"))
        sid = jar["sid"].value if "sid" in jar else None
        status, body, new_sid = handle_api(parsed.path, self._read_json(), sid)
        if status == 404:
            self.send_response(404)
            self.end_headers()
            return
        set_cookie = None
        if new_sid:
            set_cookie = f"sid={new_sid}; Path=/; HttpOnly; SameSite=Lax"
        elif new_sid == "":
            set_cookie = "sid=; Path=/; Max-Age=0"
        self._send_json(body, status=status, set_cookie=set_cookie)


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"SecLab Terminal backend: http://localhost:{PORT}")
    print(f"  mdtask DB:  {MDTASK_DB}")
    print(f"  sandboxes:  {CTF_CAESAR_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
