"""
Задание №4 «Поиск и правка конфигурационных файлов» (configs).

У каждого студента своя копия файловой системы учебного сервера
(data/ctf/configs/<id>/: /etc, /var, /usr, /home/<id> ...) и свои целевые значения.
Студент находит нужные файлы (find, grep) и меняет параметры без редактора (sed -i, tee).

Этот модуль общий для:
  - терминала (server/app.py) — автопроверка после каждой записи в файлы и команда check;
  - генератора (ctf/configs/generate_configs.py) — параметры и эталонные хеши файлов-обманок;
  - чекера (checks/task4_check.py) — отчёт в формате run_all.py.

Проверяется «действующее» значение — так, как его прочитает сам сервис:
  sshd    — первое значение параметра с учётом Include (sshd_config.d подключается в начале!);
  Apache  — Listen вне <IfModule> в ports.conf, <VirtualHost *:порт> включённого сайта,
            последнее значение ServerTokens/ServerSignature во включённом security.conf;
  MariaDB — последнее bind-address в секциях [server]/[mysqld]/[mariadb] файлов mariadb.conf.d;
  PHP     — последнее upload_max_filesize в php.ini для Apache (не CLI!).
"""

import glob
import hashlib
import json
import os
import re
import sqlite3
import time
import uuid
from pathlib import Path

TASK_KEY = "configs"

TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ib_config_tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  params TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_config_tasks_student ON ib_config_tasks(student_id);
"""

UPLOAD_SIZES = ["16M", "32M", "48M", "64M", "100M", "128M", "256M"]

# Файлы, которые трогать не нужно: клиентский конфиг, шаблоны, резервные копии.
# Пути относительно корня песочницы; '{home}' — домашний каталог студента.
DECOYS = [
    "etc/ssh/ssh_config",
    "usr/share/openssh/sshd_config",
    "var/backups/sshd_config.bak",
    "var/backups/ports.conf.bak",
    "etc/php/8.2/cli/php.ini",
    "usr/lib/php/8.2/php.ini-production",
    "usr/lib/php/8.2/php.ini-development",
    "etc/apache2/sites-available/default-ssl.conf",
    "etc/mysql/my.cnf.fallback",
    "{home}/backup/sshd_config.old",
    "{home}/backup/ports.conf.old",
]


def make_params(rng):
    return {
        "ssh_port": rng.randint(2200, 2999),
        "apache_port": rng.choice([p for p in range(8000, 9000) if p not in (8080, 8443)]),
        "upload_max": rng.choice(UPLOAD_SIZES),
    }


def decoy_paths(student_id):
    return [p.replace("{home}", f"home/{student_id}") for p in DECOYS]


def file_hash(path):
    try:
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except OSError:
        return None


# ------------------------------------------------------------- разбор ---

def _read(root, rel):
    try:
        return Path(root, rel).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def _active_lines(text, comment="#"):
    for line in (text or "").splitlines():
        s = line.strip()
        if not s or s.startswith(comment):
            continue
        yield s


def sshd_effective(root):
    """{параметр в нижнем регистре: [значения в порядке чтения sshd]}."""
    values = {}
    seen = set()

    def parse(rel, depth=0):
        if depth > 5 or rel in seen:
            return
        seen.add(rel)
        text = _read(root, rel)
        for s in _active_lines(text):
            parts = s.split(None, 1)
            key = parts[0].lower()
            val = parts[1].strip() if len(parts) > 1 else ""
            if key == "match":
                return
            if key == "include":
                for pattern in val.split():
                    if not pattern.startswith("/"):
                        pattern = "/etc/ssh/" + pattern
                    for path in sorted(glob.glob(str(Path(root)) + pattern)):
                        parse(os.path.relpath(path, root), depth + 1)
                continue
            values.setdefault(key, []).append(val)

    parse("etc/ssh/sshd_config")
    return values


def apache_listen(root):
    ports = []
    depth = 0
    for s in _active_lines(_read(root, "etc/apache2/ports.conf")):
        if re.match(r"<IfModule\b", s, re.I):
            depth += 1
        elif re.match(r"</IfModule>", s, re.I):
            depth -= 1
        elif depth == 0 and re.match(r"Listen\s", s, re.I):
            ports.append(s.split(None, 1)[1].strip())
    return ports


def apache_vhost_ports(root):
    text = _read(root, "etc/apache2/sites-enabled/000-default.conf")
    return re.findall(r"^\s*<VirtualHost\s+\*:(\d+)\s*>", text or "", re.M | re.I)


def apache_last(root, key):
    value = None
    for s in _active_lines(_read(root, "etc/apache2/conf-enabled/security.conf")):
        parts = s.split(None, 1)
        if parts[0].lower() == key.lower():
            value = parts[1].strip() if len(parts) > 1 else ""
    return value


def mariadb_bind(root):
    value = None
    for path in sorted(glob.glob(str(Path(root, "etc/mysql/mariadb.conf.d")) + "/*.cnf")):
        section = None
        for s in _active_lines(Path(path).read_text(encoding="utf-8", errors="replace")):
            if s.startswith(";"):
                continue
            m = re.match(r"\[(.+)\]", s)
            if m:
                section = m.group(1).strip().lower()
                continue
            m = re.match(r"bind[-_]address\s*=\s*(\S+)", s, re.I)
            if m and section in ("server", "mysqld", "mariadb", "mariadbd"):
                value = m.group(1)
    return value


def php_value(root, key, rel="etc/php/8.2/apache2/php.ini"):
    value = None
    for s in _active_lines(_read(root, rel), comment=";"):
        m = re.match(rf"{re.escape(key)}\s*=\s*(.*)$", s)
        if m:
            value = m.group(1).split(";")[0].strip().strip('"')
    return value


# ------------------------------------------------------------ проверка ---

def _first(values, key):
    v = values.get(key)
    return v[0] if v else None


def check(root, params, student_id):
    """-> список этапов {stage, title, status: pass|fail, detail, required}."""
    stages = []

    def add(title, ok, detail, required=True):
        stages.append({"stage": len(stages) + 1, "title": title, "status": "pass" if ok else "fail",
                       "detail": detail, "required": required})

    ssh = sshd_effective(root)
    ports = ssh.get("port", [])
    want = str(params["ssh_port"])
    add(f"SSH: порт {want}", ports == [want] or (ports and set(ports) == {want}),
        f"действующий Port: {', '.join(ports) if ports else 'не задан (по умолчанию 22)'}")
    prl = _first(ssh, "permitrootlogin")
    add("SSH: вход root запрещён (PermitRootLogin no)", (prl or "").lower() == "no",
        f"действующее значение: {prl or 'не задано (по умолчанию prohibit-password)'}")
    pa = _first(ssh, "passwordauthentication")
    add("SSH: вход по паролю отключён (PasswordAuthentication no)", (pa or "").lower() == "no",
        f"действующее значение: {pa or 'не задано (по умолчанию yes)'} — sshd берёт ПЕРВОЕ значение, "
        "а файлы из sshd_config.d подключаются в самом начале sshd_config")

    ap = str(params["apache_port"])
    listen = apache_listen(root)
    add(f"Apache: Listen {ap} в ports.conf", listen == [ap],
        f"Listen вне <IfModule>: {', '.join(listen) if listen else 'нет'}")
    vh = apache_vhost_ports(root)
    add(f"Apache: сайт 000-default на порту {ap} (<VirtualHost *:{ap}>)", bool(vh) and set(vh) == {ap},
        f"порт во включённом сайте sites-enabled/000-default.conf: {', '.join(vh) if vh else 'не найден'}")
    tokens = apache_last(root, "ServerTokens")
    sig = apache_last(root, "ServerSignature")
    add("Apache: ServerTokens Prod и ServerSignature Off",
        (tokens or "").lower() in ("prod", "productonly") and (sig or "").lower() == "off",
        f"ServerTokens {tokens or '—'}, ServerSignature {sig or '—'}")

    bind = mariadb_bind(root)
    add("MariaDB: bind-address = 127.0.0.1", bind == "127.0.0.1", f"действующее значение: {bind or 'не задано'}")

    up = params["upload_max"]
    val = php_value(root, "upload_max_filesize")
    add(f"PHP (Apache): upload_max_filesize = {up}", (val or "").upper() == up.upper(),
        f"в /etc/php/8.2/apache2/php.ini: {val or 'не задано'}")

    expected = params.get("decoys", {})
    changed = [p for p, h in expected.items() if file_hash(Path(root, p)) != h]
    add("Посторонние файлы не изменены (копии, шаблоны, конфиг клиента)", not changed,
        "изменены: " + ", ".join("/" + p for p in changed) if changed else "всё в порядке", required=False)
    return stages


def summary(stages):
    required = [s for s in stages if s["required"]]
    passed = sum(1 for s in required if s["status"] == "pass")
    return passed, len(required), passed == len(required)


def report_text(stages):
    lines = ["Проверка задания №4:"]
    for s in stages:
        mark = "✔" if s["status"] == "pass" else ("✘" if s["required"] else "!")
        lines.append(f"  {mark} {s['stage']}. {s['title']}")
        if s["status"] != "pass":
            lines.append(f"       {s['detail']}")
    passed, total, solved = summary(stages)
    lines.append(f"Выполнено пунктов: {passed} из {total}." + (" Задание засчитано!" if solved else ""))
    return "\n".join(lines)


def report_json(student_id, stages):
    passed = sum(1 for s in stages if s["status"] == "pass")
    return {"task": "task4", "student": student_id, "total_stages": len(stages),
            "passed_stages": passed, "stages": stages}


# ----------------------------------------------------------------- БД ---

def ensure_table(conn):
    conn.executescript(TABLE_SQL)


def load_row(conn, student_id):
    conn.row_factory = sqlite3.Row
    return conn.execute("SELECT * FROM ib_config_tasks WHERE student_id=?", (student_id,)).fetchone()


def insert_row(conn, student_id, params):
    conn.execute(
        "INSERT INTO ib_config_tasks (id, student_id, params, created_at) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), student_id, json.dumps(params, ensure_ascii=False),
         time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
    )


def save_progress(conn, student_id, stages):
    """Записывает прогресс. Возвращает True, если задание только что засчитано."""
    passed, total, solved = summary(stages)
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    row = conn.execute("SELECT solved FROM ib_config_tasks WHERE student_id=?", (student_id,)).fetchone()
    if row is None:
        return False
    was = bool(row[0])
    conn.execute(
        "UPDATE ib_config_tasks SET passed=?, total=?, checked_at=?, solved=?, "
        "solved_at=CASE WHEN ? AND solved=0 THEN ? ELSE solved_at END WHERE student_id=?",
        (passed, total, now, 1 if (solved or was) else 0, 1 if solved else 0, now, student_id),
    )
    conn.commit()
    return solved and not was
