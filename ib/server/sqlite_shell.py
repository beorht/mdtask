"""
Эмуляция утилиты sqlite3 для веб-терминала (server/app.py).

SQL выполняет настоящий движок SQLite (модуль sqlite3 стандартной библиотеки),
поэтому поддерживается весь язык: DDL/DML, транзакции, JOIN, CTE, оконные
функции, триггеры, представления и т.д. Поверх движка реализованы
dot-команды (.tables, .schema, .mode ...) и вывод результатов в режимах
box/table/column/markdown/list/csv/tabs/line/json — как в оригинальной CLI.

Ограничения песочницы:
  - файлы БД открываются только внутри домашнего каталога студента
    (резолвер путей передаётся из app.py);
  - ATTACH/DETACH запрещены (через них — а также через VACUUM INTO — можно
    было бы читать и писать файлы за пределами песочницы);
  - размер БД ограничен MAX_PAGE_COUNT страницами, время выполнения одной
    команды — QUERY_TIMEOUT секундами, вывод — MAX_ROWS строками.

Защищённые паролем базы (protected_db.py, задание №3): `sqlite3 файл` сначала
спрашивает пароль (PasswordPrompt), затем база расшифровывается в память —
изменения в ней на диск не сохраняются.
"""

import csv
import io
import json
import shlex
import sqlite3
import threading
import time
import unicodedata

import protected_db

MAX_PAGE_COUNT = 2560          # ~10 МБ при page_size 4096
QUERY_TIMEOUT = 3.0            # секунд на одну введённую строку
MAX_ROWS = 1000                # строк в выводе одного запроса
MAX_CELL_WIDTH = 60            # символов в ячейке для табличных режимов

MODES = ("box", "table", "column", "markdown", "list", "csv", "tabs", "line", "json")

DENIED_PRAGMAS = {"writable_schema", "max_page_count", "temp_store_directory", "data_store_directory"}

PROMPT = "sqlite> "
CONT_PROMPT = "   ...> "

SHELL_HELP = """.databases               Показать открытые базы данных
.dump ?TABLE?            Выгрузить базу (или таблицу) в виде SQL
.exit, .quit             Выйти из sqlite3
.headers on|off          Включить/выключить заголовки столбцов
.help                    Эта справка
.indexes ?TABLE?         Показать индексы
.mode ?MODE?             Режим вывода: box table column markdown list csv tabs line json
.nullvalue TEXT          Чем отображать NULL
.open ?--readonly? FILE  Закрыть текущую БД и открыть FILE
.print TEXT              Вывести TEXT
.read FILE               Выполнить SQL из файла
.schema ?PATTERN?        Показать CREATE-выражения
.show                    Показать текущие настройки
.tables ?PATTERN?        Показать таблицы и представления
.timer on|off            Показывать время выполнения запросов
.version                 Версия SQLite"""

USAGE = """Использование: sqlite3 [ОПЦИИ] [ФАЙЛ] [SQL]
ФАЙЛ — база данных в домашнем каталоге (по умолчанию — временная БД в памяти).
Если указан SQL, он выполняется и sqlite3 сразу завершается.
Опции:
  -box -table -column -markdown -list -csv -tabs -line -json   режим вывода
  -header / -noheader      показывать / скрывать заголовки
  -nullvalue TEXT          чем отображать NULL
  -readonly                открыть БД только для чтения
  -version                 версия SQLite
  -help                    эта справка"""


class ShellError(Exception):
    pass


# ------------------------------------------------------------- форматирование ---

def text_width(s):
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in s)


def pad(s, width, right=False):
    gap = " " * max(0, width - text_width(s))
    return gap + s if right else s + gap


def truncate(s, width):
    if text_width(s) <= width:
        return s
    out, w = "", 0
    for ch in s:
        cw = text_width(ch)
        if w + cw > width - 1:
            break
        out += ch
        w += cw
    return out + "…"


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


class Formatter:
    def __init__(self, mode, headers, nullvalue):
        self.mode = mode
        self.headers = headers
        self.nullvalue = nullvalue

    def cell(self, v, tabular):
        if v is None:
            s = self.nullvalue
        elif isinstance(v, bytes):
            s = "x'" + v.hex() + "'"
        else:
            s = str(v)
        if tabular:
            s = s.replace("\r", "").replace("\n", "\\n").replace("\t", " ")
            s = truncate(s, MAX_CELL_WIDTH)
        return s

    def render(self, columns, rows):
        handler = getattr(self, "_" + self.mode)
        return handler(columns, rows)

    def _grid(self, columns, rows):
        head = [truncate(c, MAX_CELL_WIDTH) for c in columns]
        body = [[self.cell(v, True) for v in r] for r in rows]
        widths = [text_width(h) for h in head]
        for r in body:
            for i, s in enumerate(r):
                widths[i] = max(widths[i], text_width(s))
        numeric = [
            all(is_number(r[i]) or r[i] is None for r in rows) and any(is_number(r[i]) for r in rows)
            for i in range(len(columns))
        ]
        return head, body, widths, numeric

    def _ruled(self, columns, rows, ch):
        head, body, widths, numeric = self._grid(columns, rows)
        h, v = ch["h"], ch["v"]

        def rule(left, mid, right):
            return left + mid.join(h * (w + 2) for w in widths) + right

        def row(cells, is_head=False):
            parts = [pad(c, widths[i], right=numeric[i] and not is_head) for i, c in enumerate(cells)]
            return v + " " + (" " + v + " ").join(parts) + " " + v

        out = [rule(*ch["top"])]
        if self.headers or self.mode == "box":
            out.append(row(head, True))
            out.append(rule(*ch["sep"]))
        out.extend(row(r) for r in body)
        out.append(rule(*ch["bottom"]))
        return "\n".join(out)

    def _box(self, columns, rows):
        return self._ruled(columns, rows, {
            "h": "─", "v": "│",
            "top": ("┌", "┬", "┐"), "sep": ("├", "┼", "┤"), "bottom": ("└", "┴", "┘"),
        })

    def _table(self, columns, rows):
        return self._ruled(columns, rows, {
            "h": "-", "v": "|",
            "top": ("+", "+", "+"), "sep": ("+", "+", "+"), "bottom": ("+", "+", "+"),
        })

    def _markdown(self, columns, rows):
        head, body, widths, numeric = self._grid(columns, rows)
        out = ["| " + " | ".join(pad(c, widths[i]) for i, c in enumerate(head)) + " |"]
        out.append("|" + "|".join(
            ("-" * (w + 1) + ":") if numeric[i] else ("-" * (w + 2)) for i, w in enumerate(widths)
        ) + "|")
        for r in body:
            out.append("| " + " | ".join(pad(c, widths[i], numeric[i]) for i, c in enumerate(r)) + " |")
        return "\n".join(out)

    def _column(self, columns, rows):
        head, body, widths, numeric = self._grid(columns, rows)
        out = []
        if self.headers:
            out.append("  ".join(pad(c, widths[i]) for i, c in enumerate(head)).rstrip())
            out.append("  ".join("-" * w for w in widths))
        for r in body:
            out.append("  ".join(pad(c, widths[i], numeric[i]) for i, c in enumerate(r)).rstrip())
        return "\n".join(out)

    def _sep(self, columns, rows, sep):
        out = [sep.join(columns)] if self.headers else []
        out.extend(sep.join(self.cell(v, False) for v in r) for r in rows)
        return "\n".join(out)

    def _list(self, columns, rows):
        return self._sep(columns, rows, "|")

    def _tabs(self, columns, rows):
        return self._sep(columns, rows, "\t")

    def _csv(self, columns, rows):
        buf = io.StringIO()
        w = csv.writer(buf, lineterminator="\n")
        if self.headers:
            w.writerow(columns)
        for r in rows:
            w.writerow(["" if v is None else self.cell(v, False) for v in r])
        return buf.getvalue().rstrip("\n")

    def _line(self, columns, rows):
        width = max(text_width(c) for c in columns)
        blocks = ["\n".join(pad(c, width, True) + " = " + self.cell(v, False)
                            for c, v in zip(columns, r)) for r in rows]
        return "\n\n".join(blocks)

    def _json(self, columns, rows):
        def jv(v):
            return v.hex() if isinstance(v, bytes) else v
        items = [json.dumps({c: jv(v) for c, v in zip(columns, r)}, ensure_ascii=False) for r in rows]
        return "[" + ",\n".join(items) + "]"


# ----------------------------------------------------------------- разбор SQL ---

def split_statements(sql):
    """Делит текст на завершённые SQL-выражения. Возвращает (выражения, остаток)."""
    stmts, start = [], 0
    for i, ch in enumerate(sql):
        if ch == ";" and sqlite3.complete_statement(sql[start:i + 1]):
            stmt = sql[start:i + 1].strip()
            if stmt.strip(";").strip():
                stmts.append(stmt)
            start = i + 1
    return stmts, sql[start:]


# --------------------------------------------------------------------- шелл ---

class SqliteShell:
    """Состояние одной сессии sqlite3 (живёт в сессии терминала между запросами)."""

    def __init__(self, resolve_path):
        # resolve_path(arg) -> (абсолютный путь, путь для показа) или ShellError
        self.resolve_path = resolve_path
        self.mode = "box"
        self.headers = True
        self.nullvalue = ""
        self.timer = False
        self.buffer = ""
        self.conn = None
        self.db_label = ":memory:"
        self.readonly = False
        self.lock = threading.Lock()
        self._deadline = 0.0

    # --- соединение ---

    def open(self, arg, readonly=False):
        if arg in (None, "", ":memory:"):
            target, label = ":memory:", ":memory:"
        else:
            target, label = self.resolve_path(arg)
            if protected_db.is_protected(target):
                raise ShellError(f"{arg}: база защищена паролем — откройте её командой sqlite3 {arg}")
        if readonly and target != ":memory:":
            conn = sqlite3.connect(f"file:{target}?mode=ro", uri=True,
                                   isolation_level=None, check_same_thread=False)
        else:
            conn = sqlite3.connect(target, isolation_level=None, check_same_thread=False)
        self._attach(conn, label, readonly)

    def open_bytes(self, data, label):
        """Открывает расшифрованную базу из памяти (изменения не сохраняются)."""
        conn = sqlite3.connect(":memory:", isolation_level=None, check_same_thread=False)
        conn.deserialize(data)
        self._attach(conn, label, False)

    def _attach(self, conn, label, readonly):
        conn.execute(f"PRAGMA max_page_count = {MAX_PAGE_COUNT}")
        conn.set_authorizer(self._authorizer)
        conn.set_progress_handler(self._progress, 20000)
        self.close()
        self.conn, self.db_label, self.readonly = conn, label, readonly

    def close(self):
        if self.conn is not None:
            try:
                self.conn.close()
            except sqlite3.Error:
                pass
            self.conn = None

    @staticmethod
    def _authorizer(action, arg1, arg2, dbname, source):
        if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH):
            return sqlite3.SQLITE_DENY
        if action == sqlite3.SQLITE_PRAGMA and (arg1 or "").lower() in DENIED_PRAGMAS and arg2 is not None:
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK

    def _progress(self):
        return 1 if time.monotonic() > self._deadline else 0

    @property
    def prompt(self):
        return CONT_PROMPT if self.buffer.strip() else PROMPT

    def formatter(self):
        return Formatter(self.mode, self.headers, self.nullvalue)

    # --- ввод ---

    def feed(self, line):
        """Обрабатывает одну строку ввода. Возвращает (вывод, завершить_ли_sqlite3)."""
        with self.lock:
            self._deadline = time.monotonic() + QUERY_TIMEOUT
            if not self.buffer.strip() and line.strip().startswith("."):
                try:
                    return self.dot_command(line.strip())
                except (ShellError, sqlite3.Error) as e:
                    return f"Ошибка: {e}", False
            self.buffer += line + "\n"
            stmts, rest = split_statements(self.buffer)
            self.buffer = rest if rest.strip() else ""
            return self.run_sql(stmts), False

    def interrupt(self):
        with self.lock:
            self.buffer = ""

    def run_sql(self, stmts):
        out = []
        for stmt in stmts:
            started = time.monotonic()
            try:
                cur = self.conn.execute(stmt)
                if cur.description:
                    columns = [d[0] for d in cur.description]
                    rows = cur.fetchmany(MAX_ROWS + 1)
                    cut = len(rows) > MAX_ROWS
                    rows = rows[:MAX_ROWS]
                    if rows:
                        out.append(self.formatter().render(columns, rows))
                    if cut:
                        out.append(f"(показаны первые {MAX_ROWS} строк)")
            except sqlite3.Error as e:
                msg = str(e)
                if msg == "interrupted":
                    msg = f"запрос прерван: превышено время выполнения ({QUERY_TIMEOUT:g} с)"
                elif msg in ("not authorized", "authorization denied"):
                    msg = "операция запрещена в учебной песочнице (ATTACH, VACUUM INTO, служебные PRAGMA)"
                elif msg == "database or disk is full":
                    msg = "превышен лимит размера базы данных в песочнице"
                out.append(f"Ошибка: {msg}")
                break
            except (OverflowError, ValueError) as e:
                out.append(f"Ошибка: {e}")
                break
            if self.timer:
                out.append(f"Run Time: real {time.monotonic() - started:.3f}")
        return "\n".join(out)

    # --- dot-команды ---

    def dot_command(self, line):
        try:
            parts = shlex.split(line)
        except ValueError:
            raise ShellError("незакрытая кавычка")
        cmd, args = parts[0], parts[1:]

        if cmd in (".quit", ".exit", ".q"):
            return "", True
        if cmd == ".help":
            return SHELL_HELP, False
        if cmd == ".version":
            return f"SQLite {sqlite3.sqlite_version}", False
        if cmd == ".print":
            return " ".join(args), False
        if cmd in (".headers", ".header"):
            self.headers = self._onoff(args)
            return "", False
        if cmd == ".timer":
            self.timer = self._onoff(args)
            return "", False
        if cmd == ".mode":
            if not args:
                return f"current output mode: {self.mode}", False
            if args[0] not in MODES:
                raise ShellError(f"неизвестный режим \"{args[0]}\". Доступны: {' '.join(MODES)}")
            self.mode = args[0]
            return "", False
        if cmd == ".nullvalue":
            if len(args) != 1:
                raise ShellError("использование: .nullvalue TEXT")
            self.nullvalue = args[0]
            return "", False
        if cmd == ".show":
            return "\n".join([
                f"   headers: {'on' if self.headers else 'off'}",
                f"      mode: {self.mode}",
                f" nullvalue: \"{self.nullvalue}\"",
                f"     timer: {'on' if self.timer else 'off'}",
                f"  filename: {self.db_label}",
            ]), False
        if cmd == ".databases":
            mode = "r/o" if self.readonly else "r/w"
            return f"main: {self.db_label if self.db_label != ':memory:' else ''} {mode}", False
        if cmd == ".open":
            readonly = "--readonly" in args
            files = [a for a in args if not a.startswith("--")]
            self.open(files[0] if files else None, readonly=readonly)
            return "", False
        if cmd == ".read":
            if len(args) != 1:
                raise ShellError("использование: .read FILE")
            abs_path, _ = self.resolve_path(args[0])
            try:
                sql = open(abs_path, encoding="utf-8").read()
            except FileNotFoundError:
                raise ShellError(f"не удаётся открыть \"{args[0]}\"")
            except (UnicodeDecodeError, IsADirectoryError):
                raise ShellError(f"\"{args[0]}\" не является текстовым SQL-файлом")
            stmts, rest = split_statements(sql)
            output = self.run_sql(stmts)
            if rest.strip():
                output += ("\n" if output else "") + "Ошибка: незавершённое SQL-выражение в конце файла"
            return output, False
        if cmd == ".tables":
            return self._tables(args[0] if args else "%"), False
        if cmd == ".schema":
            return self._schema(args[0] if args else None), False
        if cmd in (".indexes", ".indices"):
            return self._indexes(args[0] if args else None), False
        if cmd == ".dump":
            return self._dump(args[0] if args else None), False
        raise ShellError(f"неизвестная команда или неверные аргументы: \"{cmd[1:]}\". Наберите \".help\"")

    @staticmethod
    def _onoff(args):
        if len(args) != 1 or args[0].lower() not in ("on", "off", "1", "0", "yes", "no"):
            raise ShellError("ожидается on или off")
        return args[0].lower() in ("on", "1", "yes")

    def _query(self, sql, params=()):
        try:
            return self.conn.execute(sql, params).fetchall()
        except sqlite3.Error as e:
            raise ShellError(str(e))

    def _tables(self, pattern):
        names = [r[0] for r in self._query(
            "SELECT name FROM sqlite_schema WHERE type IN ('table','view') "
            "AND name NOT LIKE 'sqlite_%' AND name LIKE ? ORDER BY name", (pattern,))]
        if not names:
            return ""
        width = max(text_width(n) for n in names) + 2
        per_line = max(1, 80 // width)
        return "\n".join(
            "".join(pad(n, width) for n in names[i:i + per_line]).rstrip()
            for i in range(0, len(names), per_line)
        )

    def _schema(self, pattern):
        sql = ("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
               + (" AND tbl_name LIKE ?" if pattern else "")
               + " ORDER BY type='table' DESC, name")
        rows = self._query(sql, (pattern,) if pattern else ())
        return "\n".join(r[0] + ";" for r in rows)

    def _indexes(self, table):
        sql = ("SELECT name FROM sqlite_schema WHERE type='index'"
               + (" AND tbl_name LIKE ?" if table else "") + " ORDER BY name")
        return "\n".join(r[0] for r in self._query(sql, (table,) if table else ()))

    def _dump(self, table):
        try:
            if table:
                try:
                    lines = list(self.conn.iterdump(filter=table))
                except TypeError:  # Python < 3.13: без фильтра
                    lines = [l for l in self.conn.iterdump() if table in l or l in ("BEGIN TRANSACTION;", "COMMIT;")]
            else:
                lines = list(self.conn.iterdump())
        except sqlite3.Error as e:
            raise ShellError(str(e))
        return "\n".join(lines)


# --------------------------------------------------------- запуск из шелла ---

class PasswordPrompt:
    """Ожидание пароля к защищённой базе: следующая строка ввода — пароль."""

    prompt = "Password: "

    def __init__(self, shell, target, label, sql):
        self.shell, self.target, self.label, self.sql = shell, target, label, sql

    def submit(self, password):
        """Возвращает (вывод, новое_состояние, открыта_ли_база)."""
        try:
            with open(self.target, "rb") as f:
                data = protected_db.decrypt(f.read(), password)
        except OSError as e:
            return f"sqlite3: не удаётся прочитать файл: {e}", None, False
        if data is None:
            return "sqlite3: неверный пароль", None, False
        try:
            self.shell.open_bytes(data, self.label)
        except sqlite3.Error as e:
            return f"sqlite3: {e}", None, False
        output, state = after_open(self.shell, self.sql, [
            "Пароль принят. База расшифрована в память, изменения не сохраняются.",
        ])
        return output, state, True


def after_open(shell, sql, banner_extra):
    """Разовый SQL из аргумента — выполнить и выйти; иначе — интерактивный режим."""
    if sql is not None:
        output, _ = shell.feed(sql if sql.strip().startswith(".")
                               else sql.rstrip() + (";" if not sql.rstrip().endswith(";") else ""))
        shell.close()
        return output, None
    banner = [f"SQLite version {sqlite3.sqlite_version}", 'Enter ".help" for usage hints.']
    return "\n".join(banner + banner_extra), shell


def start(raw_args, resolve_path):
    """Команда `sqlite3 [ОПЦИИ] [ФАЙЛ] [SQL]` из bash-эмулятора.

    Возвращает (вывод, состояние): None — остаёмся в bash, SqliteShell —
    интерактивный режим sqlite3, PasswordPrompt — ждём пароль к базе.
    """
    try:
        args = shlex.split(raw_args)
    except ValueError:
        return "sqlite3: незакрытая кавычка", None

    shell = SqliteShell(resolve_path)
    readonly = False
    positional = []
    it = iter(args)
    for a in it:
        opt = a.lstrip("-") if a.startswith("-") and len(a) > 1 else None
        if opt is None:
            positional.append(a)
        elif opt in MODES:
            shell.mode = opt
        elif opt in ("header", "headers"):
            shell.headers = True
        elif opt == "noheader":
            shell.headers = False
        elif opt == "readonly":
            readonly = True
        elif opt == "nullvalue":
            shell.nullvalue = next(it, "")
        elif opt == "version":
            return f"{sqlite3.sqlite_version}", None
        elif opt == "help":
            return USAGE, None
        else:
            return f"sqlite3: неизвестная опция: {a}\nНаберите \"sqlite3 -help\" для справки", None

    if len(positional) > 2:
        return "sqlite3: слишком много аргументов. Наберите \"sqlite3 -help\"", None
    db_arg = positional[0] if positional else None
    sql = positional[1] if len(positional) == 2 else None

    try:
        if db_arg not in (None, "", ":memory:"):
            target, label = resolve_path(db_arg)
            if protected_db.is_protected(target):
                return f"База данных \"{db_arg}\" защищена паролем.", PasswordPrompt(shell, target, label, sql)
        shell.open(db_arg, readonly=readonly)
    except ShellError as e:
        return f"sqlite3: {e}", None
    except sqlite3.Error as e:
        return f"sqlite3: не удаётся открыть \"{db_arg}\": {e}", None

    extra = [] if db_arg else ["Connected to a transient in-memory database.",
                               'Use ".open FILENAME" to reopen on a persistent database.']
    return after_open(shell, sql, extra)
