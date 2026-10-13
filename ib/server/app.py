#!/usr/bin/env python3
"""
SecLab Terminal — реальный backend для prototype/terminal-lab.html.

Никаких сторонних зависимостей: только стандартная библиотека Python.

Что делает:
  - Отдаёт prototype/terminal-lab.html на "/"
  - POST /api/login   {studentId, password} -> проверяет основной пароль студента
        (users.password_hash/salt, scrypt — как в mdtask). Пароль задания №3
        для входа не подходит: он открывает защищённую базу (см. ниже)
  - POST /api/run     {cmd} -> выполняет командную строку (эмулятор bash: shell.py,
        find/grep/sed — cmd_find.py, cmd_grep.py, cmd_sed.py) в песочнице этого
        студента на диске: data/ctf/caesar/<id>/ для задания №3,
        data/ctf/configs/<id>/ для задания №4, data/ctf/terminal/<id>/ для №5
        (задание выбирается при входе: task)
  - POST /api/complete {line} -> дополнение по Tab (имя команды или пути)
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

import config_task
import lab_task
import shell
import terminal_task
import sqlite_shell
from vfs import FsError, Sandbox

# Корень репозитория mdtask (этот каталог — mdtask/ib/server).
REPO_ROOT = Path(__file__).resolve().parents[2]
MDTASK_DB = os.environ.get("MDTASK_DB", str(REPO_ROOT / "data" / "mdtask.db"))
CTF_CAESAR_DIR = Path(os.environ.get("CTF_CAESAR_DIR", str(REPO_ROOT / "data" / "ctf" / "caesar")))
CTF_CONFIGS_DIR = Path(os.environ.get("CTF_CONFIGS_DIR", str(REPO_ROOT / "data" / "ctf" / "configs")))
CTF_TERMINAL_DIR = Path(os.environ.get("CTF_TERMINAL_DIR", str(REPO_ROOT / "data" / "ctf" / "terminal")))
# Пошаговые задания на общем движке lab_task.py (№6 incident, №7 ssh): data/ctf/<каталог>/<id>/
CTF_LABS_DIR = Path(os.environ.get("CTF_LABS_DIR", str(REPO_ROOT / "data" / "ctf")))
TASKS = ("caesar", config_task.TASK_KEY, terminal_task.TASK_KEY) + lab_task.keys()
STATIC_DIR = Path(__file__).resolve().parent.parent / "prototype"
PORT = int(os.environ.get("PORT", 8088))

SESSIONS = {}  # sid -> {"student_id", "task", "sandbox": Sandbox, "cwd": str, "sqlite": SqliteShell | PasswordPrompt | None}
MAX_CMD_LEN = 4000

# Справка по командам — shell.HELP_TEXT.



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

def make_sandbox(task, student_id):
    """Песочница задания: №3 — домашний каталог только для чтения, №4 — целый «сервер»."""
    lab = lab_task.get(task)
    if task in (config_task.TASK_KEY, terminal_task.TASK_KEY) or lab:
        base = CTF_CONFIGS_DIR if task == config_task.TASK_KEY else CTF_TERMINAL_DIR
        if lab:
            base = CTF_LABS_DIR / lab.sandbox_dir
        root = base / student_id
        (root / "home" / student_id).mkdir(parents=True, exist_ok=True)
        return Sandbox(root, student_id, f"home/{student_id}", mapped_home=False, writable=True)
    root = CTF_CAESAR_DIR / student_id
    root.mkdir(parents=True, exist_ok=True)
    return Sandbox(root, student_id, "", mapped_home=True, writable=False)


def shell_prompt(session):
    if session.get("sqlite"):
        return session["sqlite"].prompt
    sb = session["sandbox"]
    return f"{session['student_id']}@seclab:{sb.prompt_path(session['cwd'])}$ "


def input_mode(session):
    state = session.get("sqlite")
    if isinstance(state, sqlite_shell.PasswordPrompt):
        return "password"
    return "sqlite" if state else "shell"


def db_path_resolver(session):
    """Резолвер путей к файлам БД для sqlite3 — только внутри песочницы."""
    sb = session["sandbox"]
    cwd = session["cwd"]

    def resolve(arg):
        try:
            vrel = sb.resolve(cwd, arg)
        except FsError:
            raise sqlite_shell.ShellError("доступ за пределы домашнего каталога запрещён")
        if sb.isdir(vrel):
            raise sqlite_shell.ShellError(f"{arg}: это каталог")
        parent = vrel.rsplit("/", 1)[0] if "/" in vrel else ""
        if not sb.isdir(parent):
            raise sqlite_shell.ShellError(f"{arg}: нет такого каталога")
        return sb.real(vrel), sb.display(vrel)

    return resolve


# ------------------------------------------------- задание №4: проверка ---

def config_stages(session):
    student_id = session["student_id"]
    conn = db_connect()
    try:
        config_task.ensure_table(conn)
        row = config_task.load_row(conn, student_id)
    finally:
        conn.close()
    if row is None:
        return None
    params = json.loads(row["params"])
    return config_task.check(session["sandbox"].root, params, student_id)


def config_autocheck(session):
    """После записи в файлы: пересчитать прогресс. Возвращает сообщение, если задание засчитано."""
    stages = config_stages(session)
    if stages is None:
        return None
    conn = db_connect()
    try:
        newly = config_task.save_progress(conn, session["student_id"], stages)
    finally:
        conn.close()
    if newly:
        return "[Проверка] Все пункты задания №4 выполнены — задание засчитано! Подробности: check"
    return None


def config_check_text(session):
    stages = config_stages(session)
    if stages is None:
        return "Задание №4 вам ещё не выдано."
    conn = db_connect()
    try:
        config_task.save_progress(conn, session["student_id"], stages)
    finally:
        conn.close()
    return config_task.report_text(stages)


# ------------------------------------------------ задание №5: тренажёр ---

class TerminalState:
    """Строка ib_terminal_tasks студента: значения, прогресс и доступ к журналу команд."""

    def __init__(self, session):
        self.session = session
        self.student_id = session["student_id"]
        self.conn = db_connect()
        terminal_task.ensure_tables(self.conn)
        self.row = terminal_task.load_row(self.conn, self.student_id)
        self.params = json.loads(self.row["params"]) if self.row else None
        self.progress = terminal_task.load_progress(self.row)
        self.root = session["sandbox"].root
        self.fetch = terminal_task.entries_fetcher(self.conn, self.student_id)

    def close(self):
        self.conn.close()

    def results(self, k=None):
        k, env = terminal_task.current_env(self.root, self.student_id, self.params, self.progress, self.fetch, k)
        return k, terminal_task.results_with_text(terminal_task.evaluate_stage(k, env), self.params, self.student_id)


def terminal_hooks(session):
    def with_state(fn):
        def call(*args):
            state = TerminalState(session)
            try:
                if state.row is None:
                    return "Задание №5 вам ещё не выдано."
                return fn(state, *args)
            finally:
                state.close()
        return call

    def check(state):
        _, results = state.results()
        return terminal_task.check_text(state.progress, results if state.progress["done"] < terminal_task.TOTAL else [])

    def task(state, args):
        done = state.progress["done"]
        k = done + 1
        if args:
            try:
                k = int(args[0])
            except ValueError:
                return f"task: номер этапа — число от 1 до {terminal_task.TOTAL}"
            if not 1 <= k <= terminal_task.TOTAL:
                return f"task: номер этапа — число от 1 до {terminal_task.TOTAL}"
        if k > terminal_task.TOTAL:
            return "Все этапы пройдены! Задание засчитано. Прогресс: check"
        results = state.results(k)[1] if k == done + 1 else None
        return terminal_task.stage_text(k, state.params, state.student_id, results, done)

    def answer(args):
        state = TerminalState(session)
        try:
            if state.row is None:
                return "Задание №5 вам ещё не выдано.", False
            text, ok = terminal_task.submit_answer(state.progress, state.params, state.student_id, state.root, args)
            terminal_task.save_progress(state.conn, state.student_id, state.progress)
            return text, ok
        finally:
            state.close()

    return {"check": with_state(check), "task": with_state(task), "answer": answer}


def terminal_record(session, raw, line, ctx):
    """Записывает строку в журнал и засчитывает этапы. Возвращает сообщение о пройденных этапах."""
    state = TerminalState(session)
    try:
        if state.row is None:
            return None
        log_id = terminal_task.log_line(state.conn, state.student_id, raw, line, ctx.trace, ctx.status)
        state.conn.commit()
        newly = terminal_task.advance(state.root, state.student_id, state.params, state.progress, state.fetch, log_id)
        if not newly:
            return None
        solved = terminal_task.save_progress(state.conn, state.student_id, state.progress)
        msgs = [f"[Этап {k} пройден ✔] {terminal_task.STAGES[k - 1]['title']}" for k in newly]
        if solved or state.progress["done"] >= terminal_task.TOTAL:
            msgs.append("[Проверка] Все этапы тренажёра пройдены — задание №5 засчитано! Подробности: check")
        else:
            k = state.progress["done"] + 1
            msgs.append(f"Открыт этап {k} из {terminal_task.TOTAL}: «{terminal_task.STAGES[k - 1]['title']}». "
                        "Что сделать: task")
        return "\n".join(msgs)
    finally:
        state.close()


# ------------------------------------- задания на движке lab_task (№6, №7) ---

class LabState:
    """Строка ib_lab_tasks студента для задания сессии."""

    def __init__(self, session):
        self.lab = lab_task.get(session["task"])
        self.student_id = session["student_id"]
        self.conn = db_connect()
        lab_task.ensure_tables(self.conn)
        self.row = self.lab.load_row(self.conn, self.student_id)
        self.params = json.loads(self.row["params"]) if self.row else None
        self.progress = lab_task.load_progress(self.row)
        self.root = session["sandbox"].root
        self.fetch = self.lab.entries_fetcher(self.conn, self.student_id)

    def close(self):
        self.conn.close()

    def results(self, k=None):
        k, env = self.lab.current_env(self.root, self.student_id, self.params, self.progress, self.fetch, k)
        return k, self.lab.results_with_text(self.lab.evaluate_stage(k, env), self.params, self.student_id)

    @property
    def not_assigned(self):
        return f"Задание №{self.lab.number} вам ещё не выдано."


def lab_hooks(session):
    def with_state(fn):
        def call(*args):
            state = LabState(session)
            try:
                if state.row is None:
                    return state.not_assigned
                return fn(state, *args)
            finally:
                state.close()
        return call

    def check(state):
        _, results = state.results()
        return state.lab.check_text(state.progress, results if state.progress["done"] < state.lab.total else [])

    def task(state, args):
        lab = state.lab
        done = state.progress["done"]
        k = done + 1
        if args:
            try:
                k = int(args[0])
            except ValueError:
                return f"task: номер этапа — число от 1 до {lab.total}"
            if not 1 <= k <= lab.total:
                return f"task: номер этапа — число от 1 до {lab.total}"
        if k > lab.total:
            return "Все этапы пройдены! Задание засчитано. Прогресс: check"
        results = state.results(k)[1] if k == done + 1 else None
        return lab.stage_text(k, state.params, state.student_id, results, done)

    def answer(args):
        state = LabState(session)
        try:
            if state.row is None:
                return state.not_assigned, False
            text, ok = state.lab.submit_answer(state.progress, state.params, state.student_id, state.root, args)
            state.lab.save_progress(state.conn, state.student_id, state.progress)
            return text, ok
        finally:
            state.close()

    return {"check": with_state(check), "task": with_state(task), "answer": answer}


def lab_welcome(session):
    """Текст при входе в пошаговое задание: что это за задание и инструкция к текущему этапу."""
    if lab_task.get(session["task"]) is None:
        return None
    state = LabState(session)
    try:
        lab = state.lab
        if state.row is None:
            return state.not_assigned
        head = [f"Задание №{lab.number}. {lab.title}",
                "Команды задания: task — инструкция к текущему этапу, check — прогресс, "
                "answer N.M ОТВЕТ — ответ на вопрос, cat TASK.md — все этапы.", ""]
        if state.progress["done"] >= lab.total:
            return "\n".join(head + ["Все этапы пройдены — задание засчитано. Прогресс: check"])
        k, results = state.results()
        return "\n".join(head + [lab.stage_text(k, state.params, state.student_id, results, state.progress["done"])])
    finally:
        state.close()


def lab_record(session, raw, line, ctx):
    """Журнал + засчитывание этапов + предупреждение о нарушенных критических пунктах."""
    state = LabState(session)
    try:
        if state.row is None:
            return None
        lab = state.lab
        log_id = lab.log_line(state.conn, state.student_id, raw, line, ctx.trace, ctx.status)
        state.conn.commit()
        newly = lab.advance(state.root, state.student_id, state.params, state.progress, state.fetch, log_id)
        msgs = []
        if ctx.wrote:
            for text in lab.broken_critical(state.root, state.student_id, state.params, state.progress):
                msgs.append(f"[Внимание, критично] Нарушено: {text}")
        if newly:
            solved = lab.save_progress(state.conn, state.student_id, state.progress)
            msgs += [f"[Этап {k} пройден ✔] {lab.stages[k - 1]['title']}" for k in newly]
            if solved or state.progress["done"] >= lab.total:
                msgs.append(f"[Проверка] Все этапы пройдены — задание №{lab.number} засчитано! Подробности: check")
            else:
                k = state.progress["done"] + 1
                msgs.append(f"Открыт этап {k} из {lab.total}: «{lab.stages[k - 1]['title']}». Что сделать: task")
        return "\n".join(msgs) or None
    finally:
        state.close()


def run_line(session, line):
    """Выполняет строку ввода: в sqlite3, если он открыт, иначе в bash-эмуляторе."""
    state = session.get("sqlite")
    if isinstance(state, sqlite_shell.PasswordPrompt):
        output, session["sqlite"], unlocked = state.submit(line)
        if unlocked and session["task"] == "caesar":
            mark_solved(session["student_id"])
        return output

    sqlite = state
    if sqlite:
        output, done = sqlite.feed(line)
        if done:
            sqlite.close()
            session["sqlite"] = None
        return output

    parts = line.strip().split(maxsplit=1)
    if parts and parts[0] in ("sqlite3", "SQLite3"):
        output, sqlite = sqlite_shell.start(parts[1] if len(parts) > 1 else "", db_path_resolver(session))
        session["sqlite"] = sqlite
        return output

    raw = line
    line, error = shell.expand_history(session, line)
    if error:
        return error
    echo = line if line != raw else ""
    shell.add_history(session, line)

    hooks = {}
    if session["task"] == config_task.TASK_KEY:
        hooks["check"] = lambda: config_check_text(session)
    if session["task"] == terminal_task.TASK_KEY:
        hooks = terminal_hooks(session)
    is_lab = lab_task.get(session["task"]) is not None
    if is_lab:
        hooks = lab_hooks(session)
    ctx = shell.Ctx(session, session["sandbox"], hooks)
    output = shell.run(ctx, line)
    session["last_status"] = ctx.status
    if ctx.clear:
        return "__CLEAR__"
    if echo:
        output = echo + ("\n" + output if output else "")
    if ctx.wrote and session["task"] == config_task.TASK_KEY:
        message = config_autocheck(session)
        if message:
            output = (output + "\n" if output else "") + message
    if (session["task"] == terminal_task.TASK_KEY or is_lab) and line.strip():
        record = lab_record if is_lab else terminal_record
        message = record(session, raw, line, ctx)
        if message:
            output = (output + "\n" if output else "") + message
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
        task = data.get("task") or "caesar"
        if task not in TASKS:
            return 200, {"ok": False, "error": f"Неизвестное задание: {task}"}, None
        if not verify_login(student_id, password):
            return 200, {"ok": False, "error": "Неверный логин или пароль"}, None
        sid = new_session(student_id, task)
        body = {"ok": True, "studentId": student_id}
        welcome = lab_welcome(SESSIONS[sid])
        if welcome:
            body["welcome"] = welcome
        return 200, body, sid

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

    if path == "/api/complete":
        if input_mode(session) != "shell":
            return 200, {"line": data.get("line") or "", "options": []}, None
        ctx = shell.Ctx(session, session["sandbox"])
        return 200, shell.complete(ctx, (data.get("line") or "")[:MAX_CMD_LEN]), None

    if path == "/api/logout":
        close_session(sid)
        return 200, {"ok": True}, ""

    if path == "/api/whoami":
        return 200, {
            "studentId": student_id,
            "task": session["task"],
            "solved": get_solved(student_id) if session["task"] == "caesar" else None,
            **prompt_state(session),
        }, None

    return 404, {}, None


# ------------------------------------------------------------------- HTTP ---

def new_session(student_id, task="caesar"):
    # Студенту без сгенерированного задания — пустой домашний каталог,
    # иначе любая команда падает с «нет такого файла или каталога».
    sandbox = make_sandbox(task, student_id)
    sid = secrets.token_hex(24)
    SESSIONS[sid] = {"student_id": student_id, "task": task, "sandbox": sandbox,
                     "cwd": sandbox.home_vrel, "sqlite": None}
    if task == terminal_task.TASK_KEY:
        # история команд тренажёра переживает выход и перезапуск сервера
        conn = db_connect()
        try:
            terminal_task.ensure_tables(conn)
            SESSIONS[sid]["history"] = terminal_task.history_lines(conn, student_id)
        finally:
            conn.close()
    lab = lab_task.get(task)
    if lab:
        conn = db_connect()
        try:
            lab_task.ensure_tables(conn)
            SESSIONS[sid]["history"] = lab.history_lines(conn, student_id)
        finally:
            conn.close()
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
    print(f"  sandboxes:  {CTF_CAESAR_DIR} (№3), {CTF_CONFIGS_DIR} (№4), {CTF_TERMINAL_DIR} (№5)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
