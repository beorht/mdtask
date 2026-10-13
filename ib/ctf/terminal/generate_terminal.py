#!/usr/bin/env python3
"""
№5. Генератор тренажёра «Основы работы в терминале Linux».

Для каждого студента:
  1. Выбирает личные значения: имя проекта, кодовое слово, слово для поиска, IP, права файла,
     версию релиза, место PDF в архиве, порт итогового задания;
  2. Строит в data/ctf/terminal/<student_id>/ небольшую систему: /etc, /var/log, /root, /usr/bin,
     /tmp и домашний каталог /home/<id> с учебными файлами (документы, загрузки, логи, архив,
     «корзина», скрипт) и условием ~/TASK.md (все этапы с личными значениями);
  3. Сохраняет значения (и то, что из них следует: число строк лога, строки ERROR, хеши файлов)
     в ib_terminal_tasks.params базы mdtask. Проверка — server/terminal_task.py.

Использование:
    ./generate_terminal.py --group IB
    ./generate_terminal.py --student st-test-001
    ./generate_terminal.py --group IB --force         # выдать заново: новые значения, песочница с нуля, прогресс обнуляется
    ./generate_terminal.py --group IB --refresh-task  # только переписать ~/TASK.md (значения и прогресс сохраняются)
    ./generate_terminal.py --group IB --repair        # вернуть потерянные исходные файлы этапа 6 (прогресс сохраняется)

По умолчанию студенты, у которых запись уже есть, пропускаются; если запись есть, а песочницы
на диске нет, — песочница восстанавливается с прежними значениями (прогресс сохраняется).
"""

import argparse
import hashlib
import json
import os
import random
import shutil
import sqlite3
import stat
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
IB_DIR = HERE.parents[1]
REPO_ROOT = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
import terminal_task  # noqa: E402

PROJECTS = ["falcon", "orion", "delta", "quasar", "nova", "pulsar", "atlas", "vega", "lynx", "comet",
            "sirius", "titan", "zephyr", "raven", "cobalt", "onyx", "kepler", "polaris", "nebula", "draco"]
CODE_WORDS = ["sunrise", "glacier", "meadow", "thunder", "harvest", "compass", "lantern", "orchard",
              "horizon", "pebble", "willow", "cascade", "ember", "frost", "maple", "summit"]
KEYWORDS = ["KESTREL", "MAGNOLIA", "GRANITE", "SAPPHIRE", "TUNDRA", "AURORA", "BASALT", "CEDAR",
            "HARBOR", "BEACON", "CITADEL", "MERIDIAN"]
AUTH_USERS = ["oracle", "postgres", "ftpuser", "guest", "test", "backup", "support", "ubuntu", "pi", "jenkins"]
MODES = ["640", "604", "664", "600", "444", "754", "700", "750"]
VERSIONS = ["1.0.0", "1.2.3", "1.4.0", "2.0.1", "2.1.0", "2.3.4", "2.5.2", "3.0.0", "3.1.7"]
EXTRA_HIDDEN = [".cache/", ".config/", ".local/", ".vimrc", ".gitconfig", ".wget-hsts", ".selected_editor",
                ".lesshst", ".viminfo"]
SERVICES = ["auth", "api", "db", "cache", "mailer", "scheduler"]
INFO_MSG = ["Запрос обработан за {n} мс", "Пользователь вошёл в систему", "Задание запущено", "Кэш обновлён",
            "Соединение установлено", "Отчёт сформирован", "Конфигурация перечитана"]
WARN_MSG = ["Медленный запрос: {n} мс", "Осталось мало места на диске: {n}%", "Повторная попытка подключения",
            "Устаревший параметр в конфигурации"]
ERROR_MSG = ["Не удалось подключиться к базе данных", "Таймаут запроса к API", "Ошибка записи в файл",
             "Неверный токен доступа", "Сервис недоступен"]
PATHS = ["/", "/login", "/api/items", "/api/users", "/static/app.js", "/static/style.css", "/admin", "/favicon.ico"]

INSTALL = time.mktime(time.strptime("2025-09-01 09:30", "%Y-%m-%d %H:%M"))


def sha(data):
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


class Tree:
    """Создаёт файлы, каталоги и ссылки; режимы и даты выставляются в finish()."""

    def __init__(self, root):
        self.root = root
        self.modes = {}
        self.mtimes = {}

    def d(self, rel, mode=0o755):
        (self.root / rel).mkdir(parents=True, exist_ok=True)
        self.modes[rel] = mode

    def f(self, rel, content, mode=0o644, mtime=None):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            path.write_bytes(content)
        else:
            path.write_text(content, encoding="utf-8")
        self.modes[rel] = mode
        self.mtimes[rel] = mtime or INSTALL

    def link(self, rel, target):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        os.symlink(target, path)
        self.mtimes[rel] = INSTALL

    def finish(self):
        for rel, mtime in self.mtimes.items():
            p = self.root / rel
            os.utime(p, (mtime, mtime), follow_symlinks=not p.is_symlink())
        for rel, mode in self.modes.items():
            p = self.root / rel
            if not p.is_symlink():
                os.chmod(p, mode)
        dirs = sorted({p for p in self.root.rglob("*") if p.is_dir() and not p.is_symlink()},
                      key=lambda p: -len(p.parts))
        for p in dirs + [self.root]:
            os.utime(p, (INSTALL, INSTALL))
        os.chmod(self.root, 0o755)


def force_rmtree(path):
    """shutil.rmtree, даже если студент снял права с каталогов (chmod 000)."""
    for dirpath, dirnames, _ in os.walk(path):
        for name in dirnames:
            p = os.path.join(dirpath, name)
            if not os.path.islink(p):
                os.chmod(p, stat.S_IRWXU)
    os.chmod(path, stat.S_IRWXU)
    shutil.rmtree(path)


# ================================================================ значения ===

def make_logs(rng):
    lines, errors = [], []
    warn = 0
    total = rng.randint(42, 78)
    n_err = rng.randint(5, 12)
    n_warn = rng.randint(4, 10)
    levels = ["ERROR"] * n_err + ["WARN"] * n_warn + ["INFO"] * (total - n_err - n_warn)
    rng.shuffle(levels)
    t = time.mktime(time.strptime("2025-10-01 08:00", "%Y-%m-%d %H:%M"))
    for level in levels:
        t += rng.randint(20, 900)
        stamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(t))
        pool = {"INFO": INFO_MSG, "WARN": WARN_MSG, "ERROR": ERROR_MSG}[level]
        msg = rng.choice(pool).format(n=rng.randint(5, 99) if level == "WARN" else rng.randint(12, 950))
        line = f"{stamp} {level:<5} [{rng.choice(SERVICES)}] {msg}"
        lines.append(line)
        if level == "ERROR":
            errors.append(line)
        if level == "WARN":
            warn += 1
    return "\n".join(lines) + "\n", len(lines), errors, warn


def make_access(rng):
    ips = sorted({f"{rng.choice(['10.0.', '192.168.', '172.16.'])}{rng.randint(0, 9)}.{rng.randint(2, 254)}"
                  for _ in range(rng.randint(6, 9))})
    counts = {ip: rng.randint(3, 11) for ip in ips}
    top = rng.choice(ips)
    counts[top] = max(counts.values()) + rng.randint(2, 6)
    entries = [ip for ip, n in counts.items() for _ in range(n)]
    rng.shuffle(entries)
    t = time.mktime(time.strptime("2025-10-01 09:00", "%Y-%m-%d %H:%M"))
    lines = []
    for ip in entries:
        t += rng.randint(1, 120)
        stamp = time.strftime("%d/%b/%Y:%H:%M:%S +0300", time.localtime(t))
        code = rng.choice([200, 200, 200, 200, 304, 404, 500])
        lines.append(f'{ip} - - [{stamp}] "GET {rng.choice(PATHS)} HTTP/1.1" {code} {rng.randint(120, 9000)}')
    return "\n".join(lines) + "\n", top, ips


def make_params(rng):
    return {
        "project": "proj-" + rng.choice(PROJECTS),
        "code_word": f"{rng.choice(CODE_WORDS)}-{rng.randint(10, 99)}",
        "keyword": f"{rng.choice(KEYWORDS)}-{rng.randint(100, 999)}",
        "auth_user": rng.choice(AUTH_USERS),
        "mystery_mode": rng.choice(MODES),
        "final_port": rng.choice([p for p in range(3000, 10000) if p not in (3306, 5432, 8080, 8443)]),
    }


# ================================================================ песочница ===

BASHRC = """# ~/.bashrc: executed by bash(1) for non-login shells.
case $- in *i*) ;; *) return;; esac
HISTSIZE=1000
alias ll='ls -alF'
alias la='ls -A'
"""
PROFILE = """# ~/.profile: executed by the command interpreter for login shells.
if [ -n "$BASH_VERSION" ] && [ -f "$HOME/.bashrc" ]; then . "$HOME/.bashrc"; fi
"""
BACKUP_SH = """#!/bin/bash
# Резервное копирование документов в ~/backups
echo "Резервное копирование: $(date)"
mkdir -p ~/backups
cp -r ~/documents ~/backups/
echo "Готово: документы скопированы в ~/backups/documents"
"""
CONFIG_FILES = {
    "app.ini": "[app]\nname = demo\ndebug = false\nworkers = 4\n",
    "db.ini": "[database]\nhost = 127.0.0.1\nport = 5432\nname = demo\n",
    "logging.ini": "[logging]\nlevel = INFO\nfile = /var/log/demo/app.log\n",
}
LETTER_TOPICS = ["Перенос встречи", "Отчёт за квартал", "Доступ к серверу", "Закупка оборудования",
                 "Планирование отпуска", "Обновление сайта", "Резервные копии", "Новый сотрудник"]


def make_report(student_id, rng):
    return (f"Отчёт о работе сервера seclab\nПодготовил: {student_id}\n\nДоступность: 99.{rng.randint(1, 98)}%\n"
            f"Инцидентов: {rng.randint(0, 5)}\n")


def make_data_csv(rng):
    return "id,name,score\n" + "".join(f"{k},user{k:02d},{rng.randint(40, 100)}\n" for k in range(1, rng.randint(9, 16)))


def build(root, student_id, params, rng):
    t = Tree(root)
    home = f"home/{student_id}"

    # --- система ---
    for d in ("etc", "var", "var/log", "var/log/apt", "usr", "usr/bin", "opt", "home", "srv"):
        t.d(d)
    t.d("root", 0o700)
    t.d("tmp", 0o1777)
    t.d("var/log/private", 0o700)
    t.f("etc/hostname", "seclab\n")
    t.f("etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tseclab\n")
    t.f("etc/os-release", 'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\n'
                          'VERSION_ID="12"\nVERSION="12 (bookworm)"\nID=debian\n')
    t.f("etc/passwd", "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n"
                      "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nsshd:x:110:65534::/run/sshd:/usr/sbin/nologin\n"
                      f"{student_id}:x:1000:1000:{student_id}:/home/{student_id}:/bin/bash\n")
    t.f("etc/group", f"root:x:0:\nsudo:x:27:{student_id}\n{student_id}:x:1000:\n")
    t.f("etc/shadow", f"root:*:19600:0:99999:7:::\n{student_id}:$y$j9T$......:19600:0:99999:7:::\n", 0o640)
    t.f("etc/motd", "\nThe programs included with the Debian GNU/Linux system are free software.\n")
    t.f("etc/issue", "Debian GNU/Linux 12 \\n \\l\n")
    for name in ("bash", "ls", "cat", "cp", "mv", "rm", "mkdir", "chmod", "grep", "find", "sed", "less", "nano"):
        t.f(f"usr/bin/{name}", b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 56, 0o755)
    t.f("root/.bashrc", BASHRC, 0o600)
    t.f("var/log/private/secure.log", "закрытый журнал\n", 0o600)
    t.f("var/log/syslog", "Oct  1 08:00:01 seclab systemd[1]: Started Daily apt download activities.\n"
                          "Oct  1 08:05:12 seclab CRON[812]: (root) CMD (run-parts /etc/cron.hourly)\n")
    t.f("var/log/dpkg.log", "2025-09-01 09:31:02 install nano:amd64 <none> 7.2-1\n")
    t.f("var/log/apt/history.log", "Start-Date: 2025-09-01  09:31:00\nCommandline: apt install nano\n")

    auth = []
    stamp = time.mktime(time.strptime("2025-10-02 03:10", "%Y-%m-%d %H:%M"))
    attacker = f"203.0.113.{rng.randint(2, 250)}"
    for k in range(rng.randint(5, 8)):
        stamp += rng.randint(2, 40)
        s = time.strftime("%b %d %H:%M:%S", time.localtime(stamp))
        auth.append(f"{s} seclab sshd[{2100 + k}]: Failed password for invalid user {params['auth_user']} "
                    f"from {attacker} port {rng.randint(30000, 60000)} ssh2")
        if k == 1:
            s = time.strftime("%b %d %H:%M:%S", time.localtime(stamp + 1))
            auth.append(f"{s} seclab sshd[2050]: Accepted publickey for {student_id} from 10.0.0.5 port 51234 ssh2")
    t.f("var/log/auth.log", "\n".join(auth) + "\n", 0o640)

    # --- домашний каталог ---
    t.d("home", 0o755)
    t.d(home, 0o755)
    t.f(f"{home}/.bashrc", BASHRC)
    t.f(f"{home}/.profile", PROFILE)
    t.f(f"{home}/.bash_logout", "# ~/.bash_logout: executed by bash(1) when login shell exits.\n")
    t.f(f"{home}/.secret", f"Кодовое слово: {params['code_word']}\n", 0o600)
    for name in rng.sample(EXTRA_HIDDEN, rng.randint(1, 4)):
        if name.endswith("/"):
            t.d(f"{home}/{name.rstrip('/')}", 0o700)
        else:
            t.f(f"{home}/{name}", "# настройки\n")
    t.f(f"{home}/README.txt", "Добро пожаловать на учебный сервер seclab!\nУсловие тренажёра — в файле TASK.md: cat TASK.md\n"
                              "Текущий этап — команда task, прогресс — check.\n")

    # documents
    report = make_report(student_id, rng)
    t.f(f"{home}/documents/notes.txt", "Заметки администратора\n1. Проверить журналы в ~/logs\n"
                                       "2. Навести порядок в ~/trash\n3. Настроить права на ~/documents/private.txt\n")
    t.f(f"{home}/documents/report.txt", report)
    t.f(f"{home}/documents/todo.txt", "- обновить систему\n- проверить резервные копии\n- сменить пароли\n")
    t.f(f"{home}/documents/private.txt", "Личные заметки: пароль от Wi-Fi лежит в сейфе.\n", 0o644)
    t.f(f"{home}/documents/mystery.txt", "Какие у меня права? Посмотрите ls -l.\n", int(params["mystery_mode"], 8))
    letter_files = [f"documents/letters/letter_{k}.txt" for k in range(1, 6)]
    meeting_files = [f"documents/meetings/2025-0{m}-1{d}.txt" for m, d in ((7, 2), (8, 4), (9, 1), (9, 8))]
    candidates = letter_files + meeting_files
    keyword_file = rng.choice(candidates)
    for k, rel in enumerate(candidates):
        topic = LETTER_TOPICS[k % len(LETTER_TOPICS)]
        body = f"Тема: {topic}\n\nКоллеги, по теме «{topic.lower()}» прошу отписаться до пятницы.\n"
        if rel == keyword_file:
            body += f"Кодовое имя проекта: {params['keyword']}\n"
        t.f(f"{home}/{rel}", body)
    params["keyword_file"] = keyword_file

    # downloads
    for name, content in CONFIG_FILES.items():
        t.f(f"{home}/downloads/config/{name}", content)
    data_csv = make_data_csv(rng)
    t.f(f"{home}/downloads/data.csv", data_csv)
    t.f(f"{home}/downloads/image.png", b"\x89PNG\r\n\x1a\n" + bytes(rng.randrange(256) for _ in range(64)))
    t.f(f"{home}/downloads/archive.tar.gz", b"\x1f\x8b\x08\x00" + bytes(rng.randrange(256) for _ in range(64)))
    versions = sorted(rng.sample(VERSIONS, 5), key=lambda v: [int(x) for x in v.split(".")])
    release = f"app-v{rng.choice(versions[:-1])}.tar.gz"
    for v in versions:
        t.f(f"{home}/downloads/releases/app-v{v}.tar.gz", b"\x1f\x8b\x08\x00" + v.encode())
    t.link(f"{home}/downloads/current", f"releases/{release}")
    params["release"] = release

    # logs
    app_log, n_lines, errors, warns = make_logs(rng)
    access, top_ip, ips = make_access(rng)
    t.f(f"{home}/logs/app.log", app_log)
    t.f(f"{home}/logs/access.log", access)
    params.update({"app_log_lines": n_lines, "error_count": len(errors), "error_lines": errors,
                   "warn_count": warns, "top_ip": top_ip, "unique_ips": ips})

    # archive: много файлов, один PDF
    archive_files = []
    for year in ("2023", "2024", "2025"):
        for month in rng.sample(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"], 4):
            for k in range(rng.randint(1, 3)):
                rel = f"archive/{year}/{month}/doc_{year}{month}_{k + 1}.txt"
                archive_files.append(rel)
                t.f(f"{home}/{rel}", f"Архивный документ {year}-{month} №{k + 1}\n")
    pdf_dir = posixpath_dir(rng.choice(archive_files))
    pdf_path = f"{pdf_dir}/scan_{rng.randint(1000, 9999)}.pdf"
    t.f(f"{home}/{pdf_path}", b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n" + bytes(rng.randrange(256) for _ in range(48)))
    params["pdf_path"] = pdf_path

    # trash
    for name in rng.sample(["cache_1.tmp", "cache_2.tmp", "session.tmp", "draft.tmp", "upload_part.tmp", "old.tmp"],
                           rng.randint(3, 5)):
        t.f(f"{home}/trash/{name}", "временные данные\n")
    t.f(f"{home}/trash/keep.txt", "Этот файл нужно оставить.\n")
    t.d(f"{home}/trash/empty_dir")
    t.f(f"{home}/trash/old_project/README", "Старый проект\n")
    t.f(f"{home}/trash/old_project/src/main.c", "int main(void) { return 0; }\n")
    t.f(f"{home}/trash/old_project/build/main.o", b"\x7fELF" + b"\x00" * 28)

    # scripts
    t.f(f"{home}/scripts/backup.sh", BACKUP_SH, 0o644)

    t.f(f"{home}/TASK.md", "")  # переписывается ниже, когда известны все значения
    params["hashes"] = {
        "report": sha(report),
        "data": sha(data_csv),
        "backup": sha(BACKUP_SH),
        "config": {name: sha(content) for name, content in CONFIG_FILES.items()},
    }
    t.finish()
    params["hidden_count"] = sum(1 for n in os.listdir(root / home) if n.startswith("."))
    write_task_md(root, student_id, params)
    return params


# ================================================================ починка ===
# Этап 6 нельзя пройти, если исходный файл потерян: копии и перемещённый data.csv сверяются по
# SHA-256 с оригиналом. --repair возвращает исходные файлы этапа, ничего больше не трогая.

REPAIR_STAGE = 6


def find_by_hash(home, digest):
    for dirpath, _, files in os.walk(home):
        for name in files:
            p = Path(dirpath, name)
            if p.is_symlink():
                continue
            try:
                if sha(p.read_bytes()) == digest:
                    return p
            except OSError:
                pass
    return None


def put_file(path, content):
    if path.is_symlink() or path.is_file():
        path.unlink()
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content, encoding="utf-8")
    os.chmod(path, 0o644)
    os.utime(path, (INSTALL, INSTALL))


def is_hash(path, digest):
    try:
        return path.is_file() and not path.is_symlink() and sha(path.read_bytes()) == digest
    except OSError:
        return False


def repair(root, student_id, params, rng):
    """Возвращает исходные файлы этапа 6 (data.csv, report.txt, downloads/config).
    Если оригинал нигде не найден, кладёт новый файл и обновляет его хеш в params.
    -> список сделанного (пустой — чинить нечего)."""
    home = root / "home" / student_id
    rel = lambda p: "~/" + str(p.relative_to(home))  # noqa: E731
    hashes = params["hashes"]
    done = []

    # data.csv: должен лежать в ~/downloads (студент переместит его заново)
    src = home / "downloads" / "data.csv"
    target = home / params["project"] / "data" / "data.csv"
    if not is_hash(src, hashes["data"]) and not is_hash(target, hashes["data"]):
        if src.is_dir() and not src.is_symlink():
            done.append(f"{rel(src)} — каталог, пропущено (разберитесь вручную)")
        else:
            found = find_by_hash(home, hashes["data"])
            if found:
                data = found.read_bytes()
                found.unlink()
                put_file(src, data)
                done.append(f"data.csv: оригинал найден в {rel(found)}, возвращён в {rel(src)}")
            else:
                data_csv = make_data_csv(rng)
                put_file(src, data_csv)
                hashes["data"] = sha(data_csv)
                done.append(f"data.csv: оригинал потерян, в {rel(src)} положен новый (хеш обновлён)")
        # каталог data.csv на месте цели (mkdir с лишними аргументами) мешает mv
        if target.is_dir() and not target.is_symlink() and not any(target.iterdir()):
            target.rmdir()
            done.append(f"удалён пустой каталог {rel(target)}")

    # report.txt: оригинал должен остаться в ~/documents
    report = home / "documents" / "report.txt"
    if not is_hash(report, hashes["report"]):
        found = find_by_hash(home, hashes["report"])
        if found:
            put_file(report, found.read_bytes())
            done.append(f"report.txt: оригинал скопирован из {rel(found)} в {rel(report)}")
        elif not (report.is_dir() and not report.is_symlink()):
            text = make_report(student_id, rng)
            put_file(report, text)
            hashes["report"] = sha(text)
            done.append(f"report.txt: оригинал потерян, в {rel(report)} положен новый (хеш обновлён)")

    # downloads/config: содержимое у всех одинаковое, хеши не меняются
    for name, content in CONFIG_FILES.items():
        path = home / "downloads" / "config" / name
        if not is_hash(path, hashes["config"][name]) and not (path.is_dir() and not path.is_symlink()):
            put_file(path, content)
            done.append(f"восстановлен {rel(path)}")
    return done


def posixpath_dir(rel):
    return rel.rsplit("/", 1)[0]


def write_task_md(root, student_id, params):
    path = Path(root) / "home" / student_id / "TASK.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(terminal_task.task_markdown(params, student_id), encoding="utf-8")
    os.chmod(path, 0o644)
    os.utime(path, (INSTALL, INSTALL))


# ===================================================================== CLI ===

def ensure_users(conn, group, student):
    if student:
        if not conn.execute("SELECT id FROM users WHERE id=? AND role='student'", (student,)).fetchone():
            sys.exit(f"Студент {student} не найден")
        return [student]
    rows = conn.execute("SELECT id FROM users WHERE role='student' AND student_group=? ORDER BY id", (group,)).fetchall()
    if not rows:
        sys.exit(f"В группе {group} нет студентов")
    return [r[0] for r in rows]


def main():
    ap = argparse.ArgumentParser(description="Задание №5: тренажёр основных команд терминала")
    who = ap.add_mutually_exclusive_group(required=True)
    who.add_argument("--group", help="student_group (например IB)")
    who.add_argument("--student", help="один студент (например st-test-001)")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--out", default=str(REPO_ROOT / "data" / "ctf" / "terminal"))
    ap.add_argument("--force", action="store_true", help="выдать заново: новые значения, песочница с нуля, прогресс обнуляется")
    ap.add_argument("--refresh-task", action="store_true",
                    help="только переписать ~/TASK.md у тех, кому задание уже выдано (значения и прогресс сохраняются)")
    ap.add_argument("--repair", action="store_true",
                    help=f"вернуть потерянные исходные файлы этапа {REPAIR_STAGE} тем, кто его ещё не прошёл "
                         "(прогресс, ответы и журнал сохраняются)")
    args = ap.parse_args()
    if sum((args.force, args.refresh_task, args.repair)) > 1:
        sys.exit("--force, --refresh-task и --repair несовместимы")

    out_root = Path(args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    terminal_task.ensure_tables(conn)
    students = ensure_users(conn, args.group, args.student)

    created = restored = skipped = 0
    for student_id in students:
        rng = random.Random()
        root = (out_root / student_id).resolve()
        if root.parent != out_root:
            sys.exit(f"Подозрительный путь песочницы: {root}")
        row = terminal_task.load_row(conn, student_id)
        if args.refresh_task:
            if not (row and root.exists()):
                skipped += 1
                continue
            write_task_md(root, student_id, json.loads(row["params"]))
            restored += 1
            print(f"  {student_id}: TASK.md обновлён")
            continue
        if args.repair:
            if not (row and root.exists()):
                skipped += 1
                continue
            if terminal_task.load_progress(row)["done"] >= REPAIR_STAGE:
                skipped += 1
                continue
            params = json.loads(row["params"])
            actions = repair(root, student_id, params, rng)
            if not actions:
                skipped += 1
                continue
            conn.execute("UPDATE ib_terminal_tasks SET params=? WHERE student_id=?",
                         (json.dumps(params, ensure_ascii=False), student_id))
            conn.commit()
            restored += 1
            print(f"  {student_id}:")
            for a in actions:
                print(f"    - {a}")
            continue
        if row and not args.force and root.exists():
            skipped += 1
            continue
        if row and not args.force:
            # песочницы нет на диске — восстановить с прежними значениями
            base = {k: v for k, v in json.loads(row["params"]).items()
                    if k in ("project", "code_word", "keyword", "auth_user", "mystery_mode", "final_port")}
        else:
            base = make_params(rng)
        if root.exists():
            force_rmtree(root)
        params = build(root, student_id, dict(base), rng)
        if row and args.force:
            progress = terminal_task.load_progress(None)
            progress["opened"] = {"1": terminal_task.last_log_id(conn, student_id)}
            conn.execute(
                "UPDATE ib_terminal_tasks SET params=?, progress=?, passed=0, total=?, solved=0, solved_at=NULL, "
                "checked_at=NULL WHERE student_id=?",
                (json.dumps(params, ensure_ascii=False), json.dumps(progress), terminal_task.TOTAL, student_id))
            created += 1
        elif row:
            conn.execute("UPDATE ib_terminal_tasks SET params=? WHERE student_id=?",
                         (json.dumps(params, ensure_ascii=False), student_id))
            restored += 1
        else:
            terminal_task.insert_row(conn, student_id, params)
            created += 1
        conn.commit()
        print(f"  {student_id}: проект {params['project']}, кодовое слово {params['code_word']}, "
              f"строк в логе {params['app_log_lines']}, IP {params['top_ip']}")
    conn.close()
    if args.refresh_task:
        print(f"Готово: TASK.md обновлён у {restored}, пропущено (задание не выдано) {skipped}.")
        return
    if args.repair:
        print(f"Готово: исправлено {restored}, пропущено (чинить нечего или этап {REPAIR_STAGE} пройден) {skipped}.")
        return
    print(f"Готово: выдано {created}, восстановлено {restored}, пропущено (уже есть) {skipped}. Песочницы: {out_root}")


if __name__ == "__main__":
    main()
