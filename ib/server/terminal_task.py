"""
Задание №5 «Основы работы в терминале Linux» (terminal) — пошаговый тренажёр.

У каждого студента своя песочница (data/ctf/terminal/<id>/: /etc, /var/log, /home/<id> ...)
и свои значения: имя проекта, кодовое слово, число строк в логе, IP, права файла и т.д.
Этапы проходятся строго по порядку. Каждый этап — несколько пунктов трёх видов:

  - «файлы»   — состояние песочницы: каталог создан, файл перемещён, права 600, ссылка ведёт куда нужно;
  - «команда» — команда выполнена (по журналу ib_terminal_log): ls -la, cd -, head -n, history ...
                Засчитываются только команды, выполненные ПОСЛЕ открытия этапа — порядок важен;
  - «вопрос»  — ответ командой `answer <этап>.<номер> <ответ>` (сколько строк в логе, кодовое слово ...):
                проверяется понимание, а не только набранная команда.

Этап засчитывается, когда выполнены все его пункты; пройденный этап остаётся пройденным
(дальнейшие этапы меняют файлы — например, этап 7 удаляет то, что проверялось раньше).
Прогресс (ib_terminal_tasks.progress, JSON): done — пройдено этапов, opened — id последней записи
журнала на момент открытия этапа, completed_at, answers, attempts.

Модуль общий для терминала (server/app.py: автопроверка после каждой команды, команды task,
check, answer), генератора (ctf/terminal/generate_terminal.py: условие TASK.md из этапов) и
чекера (checks/task5_check.py: отчёт в формате run_all.py).
"""

import json
import os
import posixpath
import re
import sqlite3
import time
import uuid
from pathlib import Path

import defense as defense_mod

TASK_KEY = "terminal"
TASK_NUMBER = 5
TITLE = "Основы работы в терминале Linux"

TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ib_terminal_tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  params TEXT NOT NULL,
  progress TEXT NOT NULL DEFAULT '{}',
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_terminal_tasks_student ON ib_terminal_tasks(student_id);
CREATE TABLE IF NOT EXISTS ib_terminal_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  raw TEXT NOT NULL,
  line TEXT NOT NULL,
  cmds TEXT NOT NULL DEFAULT '[]',
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_terminal_log_student ON ib_terminal_log(student_id, id);
"""

MAX_LOG_LINE = 1000


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# ======================================================== окружение проверки ===

class Env:
    """Всё, что нужно пунктам этапа: файлы песочницы, журнал команд этапа, ответы."""

    def __init__(self, root, student_id, params, entries, answers):
        self.root = Path(root)
        self.real_root = os.path.realpath(self.root)
        self.user = student_id
        self.home = f"home/{student_id}"
        self.p = params
        self.entries = entries                     # строки журнала с момента открытия этапа
        self.cmds = [c for e in entries for c in e["cmds"]]
        self.answers = answers

    # ------------------------------------------------------------- файлы ---

    def h(self, rel):
        """Путь внутри песочницы для пути от домашнего каталога."""
        return f"{self.home}/{rel}" if rel else self.home

    def disk(self, vrel):
        return self.root / vrel

    def inside(self, path):
        real = os.path.realpath(path)
        return real == self.real_root or real.startswith(self.real_root + os.sep)

    def isdir(self, vrel):
        p = self.disk(vrel)
        return p.is_dir() and not p.is_symlink() and self.inside(p)

    def isfile(self, vrel):
        p = self.disk(vrel)
        return p.is_file() and self.inside(p)

    def exists(self, vrel):
        return os.path.lexists(self.disk(vrel))

    def read(self, vrel):
        p = self.disk(vrel)
        if not self.inside(p):
            return None
        try:
            return p.read_bytes()
        except OSError:
            return None

    def text(self, vrel):
        data = self.read(vrel)
        return None if data is None else data.decode("utf-8", errors="replace")

    def mode(self, vrel):
        try:
            return os.stat(self.disk(vrel)).st_mode & 0o7777
        except OSError:
            return None

    def link_target(self, vrel):
        """Куда на самом деле ведёт ссылка (путь внутри песочницы) или None, если это не ссылка."""
        p = self.disk(vrel)
        if not p.is_symlink() or not self.inside(p):
            return None
        rel = os.path.relpath(os.path.realpath(p), self.real_root)
        return "" if rel == "." else rel.replace(os.sep, "/")

    # ---------------------------------------------------------- журнал ---

    @staticmethod
    def vpath(cwd, arg):
        """Путь из аргумента команды (уже после раскрытия ~) -> путь внутри песочницы."""
        base = arg if arg.startswith("/") else "/" + (cwd + "/" if cwd else "") + arg
        norm = posixpath.normpath(base)
        return norm.lstrip("/") if norm != "/" else ""

    @staticmethod
    def flags(cmd):
        out = set()
        for a in cmd["argv"][1:]:
            if a.startswith("--"):
                out.add(a)
            elif a.startswith("-") and len(a) > 1:
                out.update(a[1:])
        return out

    @staticmethod
    def operands(cmd):
        return [a for a in cmd["argv"][1:] if not a.startswith("-") or a == "-"]

    def ran(self, name, pred=None, ok_only=True):
        for c in self.cmds:
            argv = c["argv"]
            if not argv or posixpath.basename(argv[0]) != name:
                continue
            if ok_only and c.get("status", 0) != 0:
                continue
            if pred is None or pred(c):
                return True
        return False

    def targets(self, cmd):
        ops = self.operands(cmd)
        return [self.vpath(cmd["cwd"], o) for o in ops] if ops else [cmd["cwd"]]

    def raw_lines(self):
        return [e["raw"] for e in self.entries]


# ================================================================ ответы ===

def _norm(value):
    return re.sub(r"\s+", " ", str(value).strip().strip("'\"")).lower()


def _ans_number(expected):
    def check(value, env):
        return _norm(value) == str(expected)
    return check


def _ans_word(expected):
    def check(value, env):
        return _norm(value) == _norm(expected)
    return check


def _ans_path(expected_home_rel):
    """Путь: подходит ~/x, /home/<id>/x, x (от домашнего каталога) и даже ./x."""
    def check(value, env):
        v = value.strip().strip("'\"")
        if v.startswith("~"):
            v = f"/home/{env.user}" + v[1:]
        vrel = Env.vpath(env.home, v)
        return vrel == env.h(expected_home_rel)
    return check


def _ans_basename(expected):
    def check(value, env):
        return posixpath.basename(value.strip().strip("'\"").rstrip("/")) == expected
    return check


def _ans_mode(expected_octal):
    def check(value, env):
        v = value.strip()
        if re.fullmatch(r"0?[0-7]{3}", v):
            return int(v, 8) == int(expected_octal, 8)
        sym = v.lstrip("-")
        if re.fullmatch(r"[r-][w-][x-][r-][w-][x-][r-][w-][x-]", sym):
            n = 0
            for k, ch in enumerate(sym):
                if ch != "-":
                    n |= 1 << (8 - k)
            return n == int(expected_octal, 8)
        return False
    return check


# ================================================================= этапы ===
# Пункт: {"text": str.format(**params, user=...), "kind": "fs"|"cmd"|"answer", "check": fn(env) -> bool}
# Вопрос: "kind": "answer", "qid": "4.1", "answer": fn(value, env) -> bool.

def _home_ls(env, need):
    def pred(c):
        return env.home in env.targets(c) and need(env.flags(c))
    return env.ran("ls", pred)


def _file_text_lines(env, vrel):
    t = env.text(vrel)
    if t is None:
        return None
    return [line.rstrip() for line in t.split("\n") if line.strip() != ""]


def _same_bytes(env, vrel, digest_key):
    import hashlib
    data = env.read(vrel)
    return data is not None and hashlib.sha256(data).hexdigest() == env.p["hashes"][digest_key]


def _why_not_same(env, vrel, digest_key, source):
    """Почему копия/перемещённый файл не засчитан (для check). None — причина очевидна."""
    import hashlib
    if env.isdir(vrel):
        return f"~/{vrel[len(env.home) + 1:]} — это каталог, а не файл (проверьте: ls -l); " \
               "скорее всего, его создал mkdir с лишними аргументами"
    data = env.read(vrel)
    if data is not None and hashlib.sha256(data).hexdigest() != env.p["hashes"][digest_key]:
        return f"файл есть, но его содержимое не совпадает с исходным {source}. Если исходный файл " \
               "удалён или изменён, обратитесь к преподавателю"
    return None


def _config_copied(env):
    import hashlib
    expected = env.p["hashes"]["config"]
    for name, digest in expected.items():
        data = env.read(env.h(f"{env.p['project']}/config/{name}"))
        if data is None or hashlib.sha256(data).hexdigest() != digest:
            return False
        if env.read(env.h(f"downloads/config/{name}")) is None:
            return False
    return True


def _trash_tmp_removed(env):
    if not env.isfile(env.h("trash/keep.txt")):
        return False
    trash = env.disk(env.h("trash"))
    if not trash.is_dir():
        return False
    return not any(n.endswith(".tmp") for n in os.listdir(trash))


def _ran_script(env):
    """Скрипт запущен по пути (./backup.sh, ~/scripts/backup.sh) — для этого нужен бит x."""
    for c in env.cmds:
        name = c["argv"][0] if c["argv"] else ""
        if "/" in name and c.get("status", 1) == 0 and env.vpath(c["cwd"], name) == env.h("scripts/backup.sh"):
            return True
    return False


def _cd_to(env, pred):
    for c in env.cmds:
        if c["argv"] and c["argv"][0] == "cd" and c.get("status", 1) == 0 and pred(c):
            return True
    return False


def _expected_errors(env):
    return env.p["error_lines"]


STAGES = [
    {
        "title": "Знакомство с терминалом",
        "commands": "pwd, whoami, date, man",
        "intro": [
            "pwd — полный путь текущего каталога (print working directory)",
            "whoami — имя пользователя, под которым вы работаете",
            "date — текущие дата и время",
            "man КОМАНДА — справка по команде (man ls, man cp); help — список всех команд",
        ],
        "items": [
            {"text": "Узнайте, в каком каталоге вы находитесь: pwd", "kind": "cmd",
             "check": lambda e: e.ran("pwd")},
            {"text": "Узнайте своё имя пользователя: whoami", "kind": "cmd",
             "check": lambda e: e.ran("whoami")},
            {"text": "Посмотрите текущие дату и время: date", "kind": "cmd",
             "check": lambda e: e.ran("date")},
            {"text": "Откройте справку по команде ls: man ls", "kind": "cmd",
             "check": lambda e: e.ran("man", lambda c: e.operands(c) == ["ls"])},
        ],
    },
    {
        "title": "Просмотр каталогов: ls",
        "commands": "ls, ls -l, ls -a, ls -la, ls -lh",
        "intro": [
            "ls — список файлов текущего каталога; ls ПУТЬ — другого каталога",
            "-l — подробно: права, владелец, размер, дата; -h — размеры в K/M",
            "-a — показать скрытые файлы (имя начинается с точки), включая . и ..",
        ],
        "items": [
            {"text": "Выведите подробный список домашнего каталога: ls -l", "kind": "cmd",
             "check": lambda e: _home_ls(e, lambda f: "l" in f)},
            {"text": "Покажите скрытые файлы домашнего каталога: ls -a (или ls -la)", "kind": "cmd",
             "check": lambda e: _home_ls(e, lambda f: "a" in f or "A" in f)},
            {"text": "Посмотрите подробное содержимое каталога /etc по абсолютному пути: ls -l /etc", "kind": "cmd",
             "check": lambda e: e.ran("ls", lambda c: "l" in e.flags(c) and "etc" in e.targets(c))},
            {"text": "Сколько скрытых файлов и каталогов в домашнем каталоге (без . и ..)? Ответ: answer 2.1 ЧИСЛО",
             "kind": "answer", "qid": "2.1",
             "answer": lambda v, e: _norm(v) in (str(e.p["hidden_count"]), str(_count_hidden(e)))},
        ],
    },
    {
        "title": "Перемещение по каталогам: cd",
        "commands": "cd ПУТЬ, cd .., cd ~, cd, cd -",
        "intro": [
            "Абсолютный путь начинается с / (от корня): cd /var/log",
            "Относительный путь — от текущего каталога: cd documents/letters",
            ".. — родительский каталог, . — текущий, ~ — домашний каталог",
            "cd без аргументов (или cd ~) — домой, cd - — в предыдущий каталог",
        ],
        "items": [
            {"text": "Перейдите в каталог /var/log по абсолютному пути: cd /var/log", "kind": "cmd",
             "check": lambda e: _cd_to(e, lambda c: len(c["argv"]) > 1 and c["argv"][1].startswith("/")
                                       and c.get("cwd_after") == "var/log")},
            {"text": "Поднимитесь на уровень выше: cd ..", "kind": "cmd",
             "check": lambda e: _cd_to(e, lambda c: len(c["argv"]) > 1 and c["argv"][1].rstrip("/") == "..")},
            {"text": "Вернитесь в домашний каталог: cd (или cd ~)", "kind": "cmd",
             "check": lambda e: _cd_to(e, lambda c: c.get("cwd_after") == e.home and c["cwd"] != e.home
                                       and (len(c["argv"]) == 1 or c["argv"][1] in ("~", f"/home/{e.user}")))},
            {"text": "Из домашнего каталога перейдите в ~/documents/letters по относительному пути: cd documents/letters",
             "kind": "cmd",
             "check": lambda e: _cd_to(e, lambda c: c["cwd"] == e.home and len(c["argv"]) > 1
                                       and not c["argv"][1].startswith(("/", "-"))
                                       and c.get("cwd_after") == e.h("documents/letters"))},
            {"text": "Вернитесь в предыдущий каталог: cd -", "kind": "cmd",
             "check": lambda e: _cd_to(e, lambda c: len(c["argv"]) > 1 and c["argv"][1] == "-")},
        ],
    },
    {
        "title": "Чтение файлов: cat, head, tail, wc",
        "commands": "cat, head -n N, tail -n N, wc -l, less",
        "intro": [
            "cat ФАЙЛ — вывести файл целиком (cat -n — с номерами строк)",
            "head -n 5 ФАЙЛ — первые 5 строк, tail -n 5 ФАЙЛ — последние 5",
            "wc -l ФАЙЛ — число строк (-w — слов, -c — байтов)",
        ],
        "items": [
            {"text": "Прочитайте файл ~/documents/notes.txt: cat", "kind": "cmd",
             "check": lambda e: e.ran("cat", lambda c: e.h("documents/notes.txt") in e.targets(c))},
            {"text": "Выведите первые 5 строк журнала ~/logs/app.log: head -n 5", "kind": "cmd",
             "check": lambda e: e.ran("head", lambda c: e.h("logs/app.log") in e.targets(c)
                                      and ("n" in e.flags(c) or any(re.fullmatch(r"-\d+", a) for a in c["argv"])))},
            {"text": "Выведите последние 3 строки ~/logs/app.log: tail -n 3", "kind": "cmd",
             "check": lambda e: e.ran("tail", lambda c: e.h("logs/app.log") in e.targets(c)
                                      and ("n" in e.flags(c) or any(re.fullmatch(r"-\d+", a) for a in c["argv"])))},
            {"text": "Посчитайте строки ~/logs/app.log: wc -l", "kind": "cmd",
             "check": lambda e: e.ran("wc", lambda c: "l" in e.flags(c) and e.h("logs/app.log") in e.targets(c))},
            {"text": "Сколько строк в ~/logs/app.log? Ответ: answer 4.1 ЧИСЛО", "kind": "answer", "qid": "4.1",
             "answer": lambda v, e: _norm(v) == str(e.p["app_log_lines"]),
             "proof": lambda v, e: [str(e.p["app_log_lines"])]},
            {"text": "Какое кодовое слово записано в скрытом файле ~/.secret? Ответ: answer 4.2 СЛОВО",
             "kind": "answer", "qid": "4.2", "answer": lambda v, e: _norm(v) == _norm(e.p["code_word"]),
             "proof": lambda v, e: [e.p["code_word"]]},
        ],
    },
    {
        "title": "Создание каталогов и файлов: mkdir, touch, echo >",
        "commands": "mkdir, mkdir -p, touch, echo 'текст' > файл, echo 'текст' >> файл",
        "intro": [
            "mkdir КАТАЛОГ — создать каталог; mkdir -p a/b/c — сразу всю цепочку",
            "touch ФАЙЛ — создать пустой файл",
            "echo 'текст' > ФАЙЛ — записать текст (файл перезаписывается!)",
            "echo 'текст' >> ФАЙЛ — дописать строку в конец файла",
        ],
        "items": [
            {"text": "Создайте каталог проекта ~/{project}", "kind": "fs",
             "check": lambda e: e.isdir(e.h(e.p["project"]))},
            {"text": "Одной командой создайте цепочку ~/{project}/src/utils: mkdir -p", "kind": "fs",
             "check": lambda e: e.isdir(e.h(f"{e.p['project']}/src/utils"))},
            {"text": "Создайте файл ~/{project}/README.md, первая строка которого — «# {project}»: echo '# {project}' > ...",
             "kind": "fs",
             "check": lambda e: (_file_text_lines(e, e.h(f"{e.p['project']}/README.md")) or [""])[0]
             == f"# {e.p['project']}"},
            {"text": "Допишите в README.md вторую строку «Автор: {user}»: echo 'Автор: {user}' >> ...", "kind": "fs",
             "check": lambda e: (_file_text_lines(e, e.h(f"{e.p['project']}/README.md")) or [])[1:2]
             == [f"Автор: {e.user}"]},
            {"text": "Создайте пустые файлы ~/{project}/src/main.py и ~/{project}/src/utils/helpers.py: touch",
             "kind": "fs",
             "check": lambda e: e.isfile(e.h(f"{e.p['project']}/src/main.py"))
             and e.isfile(e.h(f"{e.p['project']}/src/utils/helpers.py"))},
        ],
    },
    {
        "title": "Копирование и перемещение: cp, mv",
        "commands": "cp ФАЙЛ КУДА, cp -r КАТАЛОГ КУДА, mv ЧТО КУДА",
        "intro": [
            "cp ИСТОЧНИК ЦЕЛЬ — копия файла; если цель — каталог, копия ложится внутрь",
            "cp -r КАТАЛОГ ЦЕЛЬ — копировать каталог со всем содержимым",
            "mv ИСТОЧНИК ЦЕЛЬ — переместить; mv старое_имя новое_имя — переименовать",
        ],
        "items": [
            {"text": "Скопируйте ~/documents/report.txt в каталог ~/{project}/docs/ (каталог docs создайте сами)",
             "kind": "fs",
             "check": lambda e: _same_bytes(e, e.h(f"{e.p['project']}/docs/report.txt"), "report")
             and _same_bytes(e, e.h("documents/report.txt"), "report"),
             "why": lambda e: _why_not_same(e, e.h(f"{e.p['project']}/docs/report.txt"), "report",
                                            "~/documents/report.txt")
             or _why_not_same(e, e.h("documents/report.txt"), "report", "(оригинал нужно оставить на месте)")},
            {"text": "Скопируйте каталог ~/downloads/config целиком в ~/{project}/config: cp -r", "kind": "fs",
             "check": _config_copied},
            {"text": "Переместите ~/downloads/data.csv в ~/{project}/data/data.csv (каталог data создайте сами): mv",
             "kind": "fs",
             "check": lambda e: not e.exists(e.h("downloads/data.csv"))
             and _same_bytes(e, e.h(f"{e.p['project']}/data/data.csv"), "data"),
             "why": lambda e: None if e.exists(e.h("downloads/data.csv"))
             else _why_not_same(e, e.h(f"{e.p['project']}/data/data.csv"), "data", "~/downloads/data.csv")},
            {"text": "Переименуйте ~/{project}/src/main.py в app.py: mv", "kind": "fs",
             "check": lambda e: e.isfile(e.h(f"{e.p['project']}/src/app.py"))
             and not e.exists(e.h(f"{e.p['project']}/src/main.py"))},
        ],
    },
    {
        "title": "Удаление: rm, rmdir",
        "commands": "rm ФАЙЛ, rm *.tmp, rmdir КАТАЛОГ, rm -r КАТАЛОГ",
        "intro": [
            "rm ФАЙЛ — удалить файл. Корзины нет: удалённое не вернуть!",
            "Маска *.tmp — все файлы, имя которых заканчивается на .tmp",
            "rmdir КАТАЛОГ — удалить пустой каталог; rm -r КАТАЛОГ — каталог со всем содержимым",
        ],
        "items": [
            {"text": "Удалите из ~/trash все файлы *.tmp одной командой, но оставьте keep.txt", "kind": "fs",
             "check": _trash_tmp_removed},
            {"text": "Удалите пустой каталог ~/trash/empty_dir: rmdir", "kind": "fs",
             "check": lambda e: not e.exists(e.h("trash/empty_dir")) and e.isdir(e.h("trash"))},
            {"text": "Удалите каталог ~/trash/old_project вместе с содержимым: rm -r", "kind": "fs",
             "check": lambda e: not e.exists(e.h("trash/old_project")) and e.isdir(e.h("trash"))},
        ],
    },
    {
        "title": "Права доступа: chmod и запуск скриптов",
        "commands": "ls -l, chmod 755, chmod u+x, chmod 600, ./скрипт.sh",
        "intro": [
            "ls -l: -rwxr-x--- — тип, затем права владельца (rwx), группы (r-x), остальных (---)",
            "r=4, w=2, x=1: rwx = 7, r-x = 5, rw- = 6, r-- = 4, --- = 0 → rwxr-x--- = 750",
            "chmod 600 ФАЙЛ — права числом; chmod u+x / go-w / a+r — буквами (u, g, o, a; +, -, =)",
            "Скрипт запускается по пути: ./backup.sh — только если у файла есть право x",
        ],
        "items": [
            {"text": "Сделайте скрипт ~/scripts/backup.sh исполняемым: chmod +x (или chmod 755)", "kind": "fs",
             "check": lambda e: (e.mode(e.h("scripts/backup.sh")) or 0) & 0o100 != 0},
            {"text": "Запустите скрипт по пути: cd ~/scripts и ./backup.sh", "kind": "cmd",
             "check": _ran_script},
            {"text": "Закройте файл ~/documents/private.txt от всех, кроме себя (rw-------): chmod 600", "kind": "fs",
             "check": lambda e: e.mode(e.h("documents/private.txt")) == 0o600},
            {"text": "Какие права у файла ~/documents/mystery.txt в числовом виде? Ответ: answer 8.1 ЧИСЛО (например 644)",
             "kind": "answer", "qid": "8.1",
             "answer": lambda v, e: _ans_mode(e.p["mystery_mode"])(v, e)},
        ],
    },
    {
        "title": "Ссылки: ln -s, readlink",
        "commands": "ln -s ЦЕЛЬ ССЫЛКА, ls -l, readlink ССЫЛКА",
        "intro": [
            "ln -s ЦЕЛЬ ИМЯ_ССЫЛКИ — символическая ссылка (ярлык); сначала цель, потом имя ссылки",
            "В ls -l ссылка выглядит так: lrwxrwxrwx ... latest.log -> /home/.../app.log",
            "readlink ССЫЛКА — куда ведёт ссылка; readlink -f — полный путь к конечному файлу",
        ],
        "items": [
            {"text": "Создайте ссылку ~/{project}/latest.log, ведущую на ~/logs/app.log: ln -s", "kind": "fs",
             "check": lambda e: e.link_target(e.h(f"{e.p['project']}/latest.log")) == e.h("logs/app.log")},
            {"text": "Создайте ссылку ~/docs на каталог ~/documents", "kind": "fs",
             "check": lambda e: e.link_target(e.h("docs")) == e.h("documents")},
            {"text": "Узнайте, куда ведёт ссылка ~/downloads/current: readlink", "kind": "cmd",
             "check": lambda e: e.ran("readlink")},
            {"text": "На какой файл указывает ссылка ~/downloads/current? Ответ: answer 9.1 ИМЯ_ФАЙЛА",
             "kind": "answer", "qid": "9.1", "answer": lambda v, e: _ans_basename(e.p["release"])(v, e)},
        ],
    },
    {
        "title": "Поиск: find и grep",
        "commands": "find ГДЕ -name 'маска', find -type f, grep, grep -c, grep -r, grep -l",
        "intro": [
            "find ~/archive -name '*.pdf' — найти файлы по имени (маску — в кавычках)",
            "-type f — только файлы, -type d — только каталоги, -iname — без учёта регистра",
            "grep СЛОВО ФАЙЛ — строки со словом; -c — сколько строк, -i — без учёта регистра",
            "grep -r СЛОВО КАТАЛОГ — искать во всех файлах каталога; -l — только имена файлов",
        ],
        "items": [
            {"text": "Найдите файлы по имени командой find с ключом -name", "kind": "cmd",
             "check": lambda e: e.ran("find", lambda c: "-name" in c["argv"] or "-iname" in c["argv"], ok_only=False)},
            {"text": "В каталоге ~/archive среди множества файлов есть ровно один PDF. Где он? "
                     "Ответ: answer 10.1 ПУТЬ (например ~/archive/...)",
             "kind": "answer", "qid": "10.1", "answer": lambda v, e: _ans_path(e.p["pdf_path"])(v, e)},
            {"text": "Сколько строк с ERROR в ~/logs/app.log? Ответ: answer 10.2 ЧИСЛО", "kind": "answer",
             "qid": "10.2", "answer": lambda v, e: _norm(v) == str(e.p["error_count"]),
             "proof": lambda v, e: [str(e.p["error_count"])]},
            {"text": "В каком файле каталога ~/documents (с подкаталогами) встречается слово {keyword}? "
                     "Ответ: answer 10.3 ИМЯ_ФАЙЛА",
             "kind": "answer", "qid": "10.3", "answer": lambda v, e: _ans_basename(e.p["keyword_file"].rsplit("/", 1)[-1])(v, e)},
        ],
    },
    {
        "title": "Конвейеры и перенаправления: |, sort, uniq, >, 2>/dev/null",
        "commands": "cmd1 | cmd2, cut, sort, uniq -c, sort -rn, head, > файл, 2>/dev/null",
        "intro": [
            "| передаёт вывод одной команды на вход следующей: cat файл | grep ERROR | wc -l",
            "cut -d' ' -f1 — первое поле строки (разделитель — пробел)",
            "sort — сортировка, uniq -c — сосчитать одинаковые соседние строки, sort -rn — по числу, по убыванию",
            "> файл — вывод в файл, 2>/dev/null — спрятать сообщения об ошибках",
        ],
        "items": [
            {"text": "С какого IP больше всего запросов в ~/logs/access.log? Ответ: answer 11.1 IP "
                     "(подсказка: cut -d' ' -f1 | sort | uniq -c | sort -rn | head -1)",
             "kind": "answer", "qid": "11.1", "answer": lambda v, e: _norm(v) == e.p["top_ip"], "proof": lambda v, e: [e.p["top_ip"]]},
            {"text": "Запишите в ~/{project}/ips.txt список всех IP из access.log без повторов, отсортированный: "
                     "cut ... | sort -u > ...",
             "kind": "fs",
             "check": lambda e: _file_text_lines(e, e.h(f"{e.p['project']}/ips.txt")) == e.p["unique_ips"]},
            {"text": "Запишите в ~/{project}/errors.txt только строки с ERROR из ~/logs/app.log: grep ... > ...",
             "kind": "fs",
             "check": lambda e: _file_text_lines(e, e.h(f"{e.p['project']}/errors.txt")) == _expected_errors(e)},
            {"text": "Выполните поиск по всей системе, спрятав ошибки доступа: find / -name '*.log' 2>/dev/null",
             "kind": "cmd",
             "check": lambda e: any(re.search(r"2>\s*/dev/null", r) for r in e.raw_lines())},
        ],
    },
    {
        "title": "Права администратора: sudo",
        "commands": "sudo КОМАНДА, sudo cat, ... | sudo tee -a файл",
        "intro": [
            "Файлы системы принадлежат root: обычному пользователю их не прочитать или не изменить",
            "sudo КОМАНДА — выполнить одну команду с правами root",
            "sudo echo 'x' > /etc/файл НЕ сработает: > выполняет ваш шелл без прав root",
            "Правильно: echo 'x' | sudo tee -a /etc/файл (tee -a — дописать в файл)",
        ],
        "items": [
            {"text": "Проверьте, под кем выполняются команды с sudo: sudo whoami", "kind": "cmd",
             "check": lambda e: e.ran("sudo", lambda c: e.operands(c)[:1] == ["whoami"])},
            {"text": "В /var/log/auth.log (читать можно только через sudo) записаны попытки подбора пароля. "
                     "Под каким именем пользователя пытались войти? Ответ: answer 12.1 ИМЯ",
             "kind": "answer", "qid": "12.1", "answer": lambda v, e: _norm(v) == e.p["auth_user"], "proof": lambda v, e: [e.p["auth_user"]]},
            {"text": "Допишите в /etc/motd строку «Сервер обслуживает: {user}»: echo '...' | sudo tee -a /etc/motd",
             "kind": "fs",
             "check": lambda e: f"Сервер обслуживает: {e.user}" in (_file_text_lines(e, "etc/motd") or [])},
        ],
    },
    {
        "title": "История команд",
        "commands": "history, !!, !N, history | grep, ↑/↓, Tab, Ctrl+C",
        "intro": [
            "history — пронумерованный список выполненных команд",
            "!! — повторить последнюю команду (sudo !! — повторить её с sudo), !N — команду номер N",
            "↑ / ↓ — листать историю, Tab — дописать имя файла или команды, Ctrl+C — отменить ввод",
        ],
        "items": [
            {"text": "Посмотрите историю команд: history", "kind": "cmd",
             "check": lambda e: e.ran("history")},
            {"text": "Повторите последнюю команду через !! (например, sudo !!)", "kind": "cmd",
             "check": lambda e: any("!!" in x["raw"] and x["line"] != x["raw"] for x in e.entries)},
            {"text": "Найдите в истории все команды cd: history | grep cd", "kind": "cmd",
             "check": lambda e: any(re.search(r"\bhistory\b[^|]*\|\s*grep\b", r) for r in e.raw_lines())},
        ],
    },
    {
        "title": "Итоговое задание",
        "commands": "всё вместе",
        "intro": [
            "Соберите структуру по описанию, используя команды всех этапов.",
        ],
        "items": [
            {"text": "Создайте каталоги ~/final/bin, ~/final/conf и ~/final/logs", "kind": "fs",
             "check": lambda e: all(e.isdir(e.h(f"final/{d}")) for d in ("bin", "conf", "logs"))},
            {"text": "Создайте ~/final/conf/app.conf ровно из двух строк: «name={project}» и «port={final_port}»",
             "kind": "fs",
             "check": lambda e: _file_text_lines(e, e.h("final/conf/app.conf"))
             == [f"name={e.p['project']}", f"port={e.p['final_port']}"]},
            {"text": "Скопируйте ~/scripts/backup.sh в ~/final/bin/start.sh и дайте права 750 (rwxr-x---)",
             "kind": "fs",
             "check": lambda e: _same_bytes(e, e.h("final/bin/start.sh"), "backup")
             and e.mode(e.h("final/bin/start.sh")) == 0o750},
            {"text": "Создайте ссылку ~/final/logs/current.log на ~/logs/app.log", "kind": "fs",
             "check": lambda e: e.link_target(e.h("final/logs/current.log")) == e.h("logs/app.log")},
            {"text": "Запишите в ~/final/logs/warnings.txt одно число — сколько строк с WARN в ~/logs/app.log "
                     "(grep -c WARN ... > ...)",
             "kind": "fs",
             "check": lambda e: (e.text(e.h("final/logs/warnings.txt")) or "").strip() == str(e.p["warn_count"])},
            {"text": "Удалите каталог ~/trash целиком", "kind": "fs",
             "check": lambda e: not e.exists(e.h("trash"))},
        ],
    },
]

TOTAL = len(STAGES)


def _count_hidden(env):
    try:
        return sum(1 for n in os.listdir(env.disk(env.home)) if n.startswith("."))
    except OSError:
        return -1


def item_text(item, params, student_id):
    return item["text"].format(**params, user=student_id)


def stage_questions(k):
    return {it["qid"]: it for it in STAGES[k - 1]["items"] if it["kind"] == "answer"}


QUESTIONS = {it["qid"]: (k, it) for k, s in enumerate(STAGES, 1) for it in s["items"] if it["kind"] == "answer"}


# ============================================================== проверка ===

def evaluate_stage(k, env):
    """-> [(пункт, выполнен)] для этапа k (1..TOTAL)."""
    res = []
    for item in STAGES[k - 1]["items"]:
        if item["kind"] == "answer":
            ok = bool(env.answers.get(item["qid"], {}).get("ok"))
        else:
            try:
                ok = bool(item["check"](env))
            except Exception:  # noqa: BLE001 — неожиданное состояние песочницы = пункт не выполнен
                ok = False
            if not ok and item.get("why"):
                try:
                    why = item["why"](env)
                except Exception:  # noqa: BLE001
                    why = None
                if why:
                    item = {**item, "_why": why}
        res.append((item, ok))
    return res


def load_progress(row):
    progress = json.loads(row["progress"] or "{}") if row else {}
    progress.setdefault("done", 0)
    progress.setdefault("opened", {"1": 0})
    progress.setdefault("completed_at", {})
    progress.setdefault("answers", {})
    progress.setdefault("attempts", {})
    return progress


def advance(root, student_id, params, progress, fetch_entries, last_log_id, defense_fn=None, seen=None):
    """Засчитывает этапы по порядку, пока очередной выполнен. -> список только что пройденных.
    defense_fn(k, env, params, progress) -> контрольные вопросы после выполнения пунктов этапа (defense.py)."""
    newly = []
    while progress["done"] < TOTAL:
        k = progress["done"] + 1
        opened = progress["opened"].get(str(k), 0)
        env = Env(root, student_id, params, fetch_entries(opened), progress["answers"])
        env.seen = seen or (lambda token: None)
        if not all(ok for _, ok in evaluate_stage(k, env)):
            break
        if defense_fn is not None and not defense_mod.gate(progress, k, lambda: defense_fn(k, env, params, progress)):
            break
        progress["done"] = k
        progress["completed_at"][str(k)] = now_iso()
        progress["opened"][str(k + 1)] = last_log_id
        newly.append(k)
    return newly


def current_env(root, student_id, params, progress, fetch_entries, k=None):
    k = k or min(progress["done"] + 1, TOTAL)
    opened = progress["opened"].get(str(k), 0)
    return k, Env(root, student_id, params, fetch_entries(opened), progress["answers"])


# ============================================================== ответы ===

def submit_answer(progress, params, student_id, root, args, seen=None):
    """answer <этап.номер> <ответ> -> (текст, верно ли). seen — «следы» вывода команд (доказательство ответа)."""
    if defense_mod.is_defense_answer(args):
        return defense_mod.answer(progress, args)
    if len(args) < 2:
        return ("Использование: answer <номер вопроса> <ответ>, например: answer 4.1 42\n"
                "Номера вопросов — в описании этапа (команда task)."), False
    qid, value = args[0], " ".join(args[1:])
    if qid not in QUESTIONS:
        return f"answer: нет вопроса с номером {qid}. Номера вопросов — в описании этапа (команда task).", False
    k, item = QUESTIONS[qid]
    current = progress["done"] + 1
    if k > current:
        return f"answer: вопрос {qid} относится к этапу {k} — он откроется после этапа {current}.", False
    if k < current:
        return f"answer: этап {k} уже пройден.", True
    if defense_mod.pending(progress)[1] is not None:
        return "Сначала ответьте на контрольный вопрос:\n" + defense_mod.text(progress), False
    progress["attempts"][qid] = progress["attempts"].get(qid, 0) + 1
    env = Env(root, student_id, params, [], progress["answers"])
    try:
        ok = bool(item["answer"](value, env))
    except Exception:  # noqa: BLE001
        ok = False
    if ok and item.get("proof") and seen is not None:
        need = [_norm(x) for x in item["proof"](value, env)]
        if any(seen(x) is None for x in need):
            progress.setdefault("no_proof", []).append({"qid": qid, "value": value[:200], "at": now_iso()})
            return (f"✘ Вопрос {qid}: значение «{value[:60]}» не встречалось в выводе ваших команд. Получите его "
                    "в своём терминале и ответьте снова (вывод команд учитывается с 21.10.2026 — если вы видели "
                    "значение раньше, выполните команду ещё раз)."), False
    if ok:
        progress["answers"][qid] = {"value": value[:200], "ok": True, "at": now_iso()}
        return f"✔ Вопрос {qid}: верно!", True
    return f"✘ Вопрос {qid}: неверно, попробуйте ещё раз.", False


# ============================================================= тексты ===

def stage_text(k, params, student_id, results=None, done=0):
    stage = STAGES[k - 1]
    state = "пройден ✔" if k <= done else ("текущий" if k == done + 1 else "ещё не открыт")
    lines = [f"Этап {k} из {TOTAL} ({state}). {stage['title']}", "Команды:"]
    lines += [f"  {x}" for x in stage["intro"]]
    lines.append("Что сделать:")
    for n, item in enumerate(stage["items"], 1):
        mark = ""
        if results is not None:
            mark = "✔ " if results[n - 1][1] else "✘ "
        elif k <= done:
            mark = "✔ "
        qid = f"[{item['qid']}] " if item["kind"] == "answer" else ""
        text = results[n - 1][0].get("_text") if results is not None else None
        lines.append(f"  {mark}{n}) {qid}{text or item_text(item, params, student_id)}")
    if k == done + 1:
        lines.append("Пункты «команда» засчитываются, если выполнить их после открытия этапа. Прогресс: check")
    return "\n".join(lines)


def check_text(progress, results):
    done = progress["done"]
    lines = [f"Тренажёр «{TITLE}»: пройдено этапов {done} из {TOTAL}."]
    for k, stage in enumerate(STAGES, 1):
        if k <= done:
            lines.append(f"  ✔ {k}. {stage['title']}")
        elif k == done + 1:
            lines.append(f"  ▶ {k}. {stage['title']} — текущий этап:")
            for item, ok in results:
                lines.append(f"       {'✔' if ok else '✘'} {item['_text']}")
        else:
            lines.append(f"  · {k}. {stage['title']}")
    lines.append("Тренажёр пройден! Задание засчитано." if done >= TOTAL else "Подробнее о текущем этапе: task")
    return "\n".join(lines)


def stages_report(progress, results):
    """Этапы в формате run_all.py (для чекера и админки)."""
    done = progress["done"]
    out = []
    for k, stage in enumerate(STAGES, 1):
        if k <= done:
            detail = "пройден " + progress["completed_at"].get(str(k), "")
        elif k == done + 1 and results is not None:
            missing = [item["_text"] for item, ok in results if not ok]
            detail = "не выполнено: " + "; ".join(missing) if missing else "все пункты выполнены"
        else:
            detail = "этап ещё не открыт"
        out.append({"stage": k, "title": stage["title"], "status": "pass" if k <= done else "fail",
                    "detail": detail, "required": True})
    return out


def report_json(student_id, stages):
    return {"task": "task5", "student": student_id, "total_stages": len(stages),
            "passed_stages": sum(1 for s in stages if s["status"] == "pass"), "stages": stages}


def results_with_text(results, params, student_id):
    out = []
    for item, ok in results:
        text = item_text(item, params, student_id)
        if item.get("_why"):
            text += f" — {item['_why']}"
        out.append(({**item, "_text": text}, ok))
    return out


# ============================================================ условие ===

def task_markdown(params, student_id):
    """~/TASK.md студента: все этапы по порядку с его личными значениями."""
    lines = [
        f"# Задание №{TASK_NUMBER}. {TITLE}",
        "",
        "Пошаговый тренажёр основных команд терминала. Этапы проходятся **строго по порядку**:",
        "следующий открывается, когда выполнены все пункты текущего.",
        "",
        "- `task` — описание текущего этапа (`task 5` — этапа 5), `check` — прогресс по всем этапам;",
        "- `answer 4.1 42` — ответ на вопрос 4.1 (номера вопросов указаны в квадратных скобках);",
        "- пункты-команды засчитываются, только если выполнить их **после открытия этапа**;",
        "- одна строка — одна команда; несколько команд соединяйте `&&` или `;`;",
        "- `help` — список команд, `man КОМАНДА` — справка, Tab — дополнение имён, ↑/↓ — история.",
        "",
        "Значения в заданиях у каждого студента свои — используйте именно эти.",
        "",
    ]
    for k, stage in enumerate(STAGES, 1):
        lines.append(f"## Этап {k}. {stage['title']}")
        lines.append("")
        for x in stage["intro"]:
            lines.append(f"- {x}")
        lines.append("")
        for n, item in enumerate(stage["items"], 1):
            qid = f"**[{item['qid']}]** " if item["kind"] == "answer" else ""
            lines.append(f"{n}. {qid}{item_text(item, params, student_id)}")
        lines.append("")
    return "\n".join(lines)


# ================================================================== БД ===

def ensure_tables(conn):
    conn.executescript(TABLE_SQL)


def load_row(conn, student_id):
    conn.row_factory = sqlite3.Row
    return conn.execute("SELECT * FROM ib_terminal_tasks WHERE student_id=?", (student_id,)).fetchone()


def insert_row(conn, student_id, params):
    conn.execute(
        "INSERT INTO ib_terminal_tasks (id, student_id, params, progress, total, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), student_id, json.dumps(params, ensure_ascii=False),
         json.dumps(load_progress(None)), TOTAL, now_iso()),
    )


def log_line(conn, student_id, raw, line, cmds, status):
    cur = conn.execute(
        "INSERT INTO ib_terminal_log (student_id, raw, line, cmds, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (student_id, raw[:MAX_LOG_LINE], line[:MAX_LOG_LINE], json.dumps(cmds, ensure_ascii=False), status, now_iso()),
    )
    return cur.lastrowid


def last_log_id(conn, student_id):
    row = conn.execute("SELECT MAX(id) FROM ib_terminal_log WHERE student_id=?", (student_id,)).fetchone()
    return row[0] or 0


def entries_fetcher(conn, student_id):
    def fetch(after_id):
        rows = conn.execute(
            "SELECT id, raw, line, cmds, status FROM ib_terminal_log WHERE student_id=? AND id>? ORDER BY id",
            (student_id, after_id),
        ).fetchall()
        return [{"id": r[0], "raw": r[1], "line": r[2], "cmds": json.loads(r[3]), "status": r[4]} for r in rows]
    return fetch


def save_progress(conn, student_id, progress):
    """Записывает прогресс. -> True, если тренажёр только что пройден целиком."""
    done = progress["done"]
    solved = done >= TOTAL
    row = conn.execute("SELECT solved FROM ib_terminal_tasks WHERE student_id=?", (student_id,)).fetchone()
    if row is None:
        return False
    was = bool(row[0])
    now = now_iso()
    conn.execute(
        "UPDATE ib_terminal_tasks SET progress=?, passed=?, total=?, checked_at=?, solved=?, "
        "solved_at=CASE WHEN ? AND solved=0 THEN ? ELSE solved_at END WHERE student_id=?",
        (json.dumps(progress, ensure_ascii=False), done, TOTAL, now, 1 if (solved or was) else 0,
         1 if solved else 0, now, student_id),
    )
    conn.commit()
    return solved and not was


def history_lines(conn, student_id, limit=200):
    rows = conn.execute(
        "SELECT raw, line FROM ib_terminal_log WHERE student_id=? ORDER BY id DESC LIMIT ?", (student_id, limit)
    ).fetchall()
    return [r[1] for r in reversed(rows)]
