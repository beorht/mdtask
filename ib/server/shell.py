"""
Эмулятор bash для веб-терминала: разбор командной строки и встроенные команды.

Поддерживается:
  - кавычки '...', "...", экранирование \\, комментарии #;
  - переменные $HOME $USER $PWD $OLDPWD $? (и ${...}), подстановка команд $(...) и `...`;
  - ~ в начале слова, маски * ? [...] (как в bash: нет совпадений — слово остаётся как есть);
  - конвейеры |, списки ; && ||;
  - перенаправления > >> < 2> 2>> 2>&1 >&2 &> (файлы песочницы и /dev/null).
    Перенаправление выполняет сам шелл с правами студента — поэтому
    `sudo echo x > /etc/файл` не сработает, а `echo x | sudo tee /etc/файл` — да.

Команды не запускают процессов: каждая — функция Python, работающая с файлами
песочницы через vfs.Sandbox. find, grep и sed — в cmd_find.py, cmd_grep.py, cmd_sed.py.
"""

import difflib
import fnmatch
import os
import posixpath
import re
import time

import vfs
from vfs import FsError

MAX_OUTPUT = 300_000        # символов вывода одной командной строки
MAX_DISPATCH = 20_000       # запусков команд за одну строку (find -exec, xargs)
MAX_SUBST_DEPTH = 5
MAX_SCRIPT_DEPTH = 3
MAX_TRACE = 200             # команд в журнале одной строки (для проверки заданий)
MAX_HISTORY = 500

HELP_TEXT = """Доступные команды:
  ls [-alhdRtS] [путь] - содержимое каталога (-a скрытые, -l подробно, -h размеры)
  cd [путь]          - перейти в каталог (cd - — в предыдущий, cd — домой)
  pwd                - показать текущий каталог
  tree [-a] [-L N]   - дерево каталогов
  cat [-n] <файл>    - показать содержимое файла (less, more — то же)
  head / tail [-n N] - первые / последние строки файла
  mkdir [-p] <каталог> - создать каталог (-p — вместе с родительскими)
  touch <файл>       - создать пустой файл (или обновить дату)
  cp [-r] <что> <куда> - копировать файл (-r — каталог целиком)
  mv <что> <куда>    - переместить или переименовать
  rm [-r] [-f] <файл> - удалить файл (-r — каталог со всем содержимым); rmdir — пустой каталог
  chmod <права> <файл> - изменить права доступа (755, u+x, go-w ...)
  ln -s <цель> <ссылка> - создать символическую ссылку; readlink — куда она ведёт
  file <файл>        - определить тип файла; basename / dirname — имя / каталог из пути
  find [путь] [выражение] - поиск файлов (-name, -type, -path, -size, -mtime, -exec ...)
  grep [опции] шаблон [файл...] - поиск строк по шаблону (-r, -n, -i, -v, -l, -E ...)
  sed [опции] скрипт [файл...]  - потоковый редактор (s/было/стало/, -i — правка файла)
  wc, sort, uniq, cut - подсчёт, сортировка, уникальные строки, вырезание полей
  xargs команда      - передать строки ввода как аргументы команде
  tee [-a] файл      - записать ввод в файл и вывести на экран
  cp, touch, diff, stat - копирование, создание, сравнение файлов, сведения о файле
  sudo команда       - выполнить команду с правами root
  man <команда>      - краткая справка по команде (find, grep, sed, xargs, sudo ...)
  whoami, id, date, echo, which, hostname, uname, printenv
  sha256sum <файл>   - контрольная сумма файла (-c — проверить по списку сумм)
  id / groups [имя], getent passwd|group [имя] - учётные записи и группы
  sudo passwd -l|-u|-S имя - заблокировать / разблокировать / состояние учётной записи
  sudo usermod -L|-U|-aG группа|-s оболочка имя, sudo gpasswd -d имя группа - изменить учётную запись
  last, sudo lastb   - журнал успешных / неудачных входов
  ssh [-i ключ] [-p порт] пользователь@localhost - подключиться по SSH (к этому же серверу)
  sudo sshd -t / -T  - проверить конфигурацию SSH / показать действующие значения
  systemctl status|reload|restart ssh, journalctl -u ssh - управление службой SSH и её журнал
  ssh-keygen -l -f ключ.pub - отпечаток ключа
  history            - история команд (!! — повторить последнюю, !N — команду N)
  ./script.sh, bash script.sh - запустить скрипт
  sqlite3 [файл]     - работа с базой данных SQLite (внутри: .help, .tables, .quit)
  clear              - очистить экран
  logout             - выйти из системы
  help               - эта справка

Конвейеры и перенаправления: cmd1 | cmd2, cmd > файл, cmd >> файл, 2>/dev/null, cmd1 && cmd2
Клавиши: Tab — дополнить имя команды или файла, ↑/↓ — история, Ctrl+C — отменить ввод, Ctrl+L — очистить экран"""

EDITORS = {"nano", "vi", "vim", "nvim", "mcedit", "emacs", "gedit", "ed", "joe", "micro", "view"}

BIN_DIR = {
    "ls": "/usr/bin/ls", "cat": "/usr/bin/cat", "find": "/usr/bin/find", "grep": "/usr/bin/grep",
    "sed": "/usr/bin/sed", "head": "/usr/bin/head", "tail": "/usr/bin/tail", "wc": "/usr/bin/wc",
    "sort": "/usr/bin/sort", "uniq": "/usr/bin/uniq", "cut": "/usr/bin/cut", "xargs": "/usr/bin/xargs",
    "tee": "/usr/bin/tee", "cp": "/usr/bin/cp", "touch": "/usr/bin/touch", "diff": "/usr/bin/diff",
    "stat": "/usr/bin/stat", "sudo": "/usr/bin/sudo", "whoami": "/usr/bin/whoami", "id": "/usr/bin/id",
    "date": "/usr/bin/date", "man": "/usr/bin/man", "which": "/usr/bin/which", "sqlite3": "/usr/bin/sqlite3",
    "egrep": "/usr/bin/egrep", "fgrep": "/usr/bin/fgrep", "echo": "/usr/bin/echo", "pwd": "/usr/bin/pwd",
    "true": "/usr/bin/true", "false": "/usr/bin/false", "mkdir": "/usr/bin/mkdir", "rmdir": "/usr/bin/rmdir",
    "rm": "/usr/bin/rm", "mv": "/usr/bin/mv", "chmod": "/usr/bin/chmod", "ln": "/usr/bin/ln",
    "readlink": "/usr/bin/readlink", "file": "/usr/bin/file", "basename": "/usr/bin/basename",
    "dirname": "/usr/bin/dirname", "tree": "/usr/bin/tree", "less": "/usr/bin/less", "more": "/usr/bin/more",
    "hostname": "/usr/bin/hostname", "uname": "/usr/bin/uname", "env": "/usr/bin/env",
    "printenv": "/usr/bin/printenv", "printf": "/usr/bin/printf", "bash": "/usr/bin/bash", "sh": "/usr/bin/sh",
    "groups": "/usr/bin/groups", "getent": "/usr/bin/getent", "passwd": "/usr/bin/passwd",
    "usermod": "/usr/sbin/usermod", "gpasswd": "/usr/bin/gpasswd", "deluser": "/usr/sbin/deluser",
    "last": "/usr/bin/last", "lastb": "/usr/bin/lastb", "sha256sum": "/usr/bin/sha256sum",
    "md5sum": "/usr/bin/md5sum", "systemctl": "/usr/bin/systemctl", "journalctl": "/usr/bin/journalctl",
    "sshd": "/usr/sbin/sshd", "ssh": "/usr/bin/ssh", "ssh-keygen": "/usr/bin/ssh-keygen",
}

MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


class ShellSyntaxError(Exception):
    pass


class OutputLimit(Exception):
    pass


# ================================================================ разбор ===

class Word:
    """Слово командной строки: части ('lit', текст, в_кавычках) / ('var', имя, в_кавычках) /
    ('cmd', команда, в_кавычках)."""

    def __init__(self):
        self.parts = []

    def add(self, kind, text, quoted):
        if kind == "lit" and self.parts and self.parts[-1][0] == "lit" and self.parts[-1][2] == quoted:
            self.parts[-1] = ("lit", self.parts[-1][1] + text, quoted)
        else:
            self.parts.append((kind, text, quoted))

    def __bool__(self):
        return bool(self.parts)


def _matching_paren(s, i):
    """s[i] — символ после '$('. Индекс закрывающей ')'."""
    depth = 1
    while i < len(s):
        c = s[i]
        if c == "\\":
            i += 2
            continue
        if c == "'":
            j = s.find("'", i + 1)
            if j == -1:
                raise ShellSyntaxError("незакрытая кавычка")
            i = j + 1
            continue
        if c == '"':
            i += 1
            while i < len(s) and s[i] != '"':
                i += 2 if s[i] == "\\" else 1
            i += 1
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ShellSyntaxError("незакрытая подстановка $(")


def _read_dollar(s, i, word, quoted):
    """s[i] == '$'. Добавляет часть в слово, возвращает новый индекс."""
    if i + 1 < len(s) and s[i + 1] == "(":
        end = _matching_paren(s, i + 2)
        word.add("cmd", s[i + 2:end], quoted)
        return end + 1
    if i + 1 < len(s) and s[i + 1] == "{":
        end = s.find("}", i + 2)
        if end == -1:
            raise ShellSyntaxError("незакрытая подстановка ${")
        word.add("var", s[i + 2:end], quoted)
        return end + 1
    m = re.match(r"[A-Za-z_][A-Za-z0-9_]*|\?", s[i + 1:])
    if m:
        word.add("var", m.group(0), quoted)
        return i + 1 + len(m.group(0))
    word.add("lit", "$", quoted)
    return i + 1


def tokenize(s):
    """Строка -> список токенов: Word или ('op', '|' / '||' / '&&' / ';') или
    ('redir', fd, режим) с режимами '>', '>>', '<', 'dup:N', '&>'."""
    tokens = []
    word = Word()
    i = 0
    n = len(s)

    def end_word():
        nonlocal word
        if word:
            tokens.append(word)
        word = Word()

    while i < n:
        c = s[i]
        if c in " \t\n":
            end_word()
            i += 1
            continue
        if c == "#" and not word:
            break
        if c == "'":
            j = s.find("'", i + 1)
            if j == -1:
                raise ShellSyntaxError("незакрытая кавычка")
            word.add("lit", s[i + 1:j], True)
            if j == i + 1:
                word.add("lit", "", True)
            i = j + 1
            continue
        if c == '"':
            i += 1
            had = False
            while True:
                if i >= n:
                    raise ShellSyntaxError("незакрытая кавычка")
                d = s[i]
                if d == '"':
                    i += 1
                    break
                had = True
                if d == "\\" and i + 1 < n and s[i + 1] in '$`"\\\n':
                    word.add("lit", s[i + 1], True)
                    i += 2
                elif d == "$":
                    i = _read_dollar(s, i, word, True)
                elif d == "`":
                    j = s.find("`", i + 1)
                    if j == -1:
                        raise ShellSyntaxError("незакрытая кавычка `")
                    word.add("cmd", s[i + 1:j], True)
                    i = j + 1
                else:
                    word.add("lit", d, True)
                    i += 1
            if not had:
                word.add("lit", "", True)
            continue
        if c == "\\":
            if i + 1 < n:
                word.add("lit", s[i + 1], True)
            i += 2
            continue
        if c == "$":
            i = _read_dollar(s, i, word, False)
            continue
        if c == "`":
            j = s.find("`", i + 1)
            if j == -1:
                raise ShellSyntaxError("незакрытая кавычка `")
            word.add("cmd", s[i + 1:j], False)
            i = j + 1
            continue
        if c in "|&;<>()":
            if c in "()":
                raise ShellSyntaxError(f"синтаксическая ошибка рядом с неожиданным маркером «{c}»")
            two = s[i:i + 2]
            if c in "<>":
                fd = None
                if word and len(word.parts) == 1 and word.parts[0][0] == "lit" and not word.parts[0][2] \
                        and word.parts[0][1].isdigit():
                    fd = int(word.parts[0][1])
                    word = Word()
                end_word()
                if c == "<":
                    tokens.append(("redir", 0 if fd is None else fd, "<"))
                    i += 1
                    continue
                fd = 1 if fd is None else fd
                if two == ">>":
                    tokens.append(("redir", fd, ">>"))
                    i += 2
                elif two == ">&":
                    m = re.match(r"\d+", s[i + 2:])
                    if not m:
                        raise ShellSyntaxError("ожидался номер дескриптора после >&")
                    tokens.append(("redir", fd, "dup:" + m.group(0)))
                    i += 2 + len(m.group(0))
                else:
                    tokens.append(("redir", fd, ">"))
                    i += 1
                continue
            end_word()
            if two == "&>":
                tokens.append(("redir", 1, "&>"))
                i += 2
            elif two in ("||", "&&"):
                tokens.append(("op", two))
                i += 2
            elif c == "&":
                raise ShellSyntaxError("запуск в фоне (&) в учебном терминале не поддерживается")
            else:
                tokens.append(("op", c))
                i += 1
            continue
        word.add("lit", c, False)
        i += 1
    end_word()
    return tokens


def parse(s):
    """-> [(pipeline, связка_перед)], pipeline = [{'words': [Word], 'redirs': [(fd, режим, Word|None)]}]."""
    tokens = tokenize(s)
    lists = []
    pipeline = []
    cmd = {"words": [], "redirs": []}
    connector = None
    i = 0

    def close_cmd():
        nonlocal cmd
        if not cmd["words"] and not cmd["redirs"]:
            return False
        pipeline.append(cmd)
        cmd = {"words": [], "redirs": []}
        return True

    while i < len(tokens):
        t = tokens[i]
        if isinstance(t, Word):
            cmd["words"].append(t)
        elif t[0] == "redir":
            _, fd, mode = t
            if mode.startswith("dup:"):
                cmd["redirs"].append((fd, mode, None))
            else:
                if i + 1 >= len(tokens) or not isinstance(tokens[i + 1], Word):
                    raise ShellSyntaxError("синтаксическая ошибка рядом с неожиданным маркером «newline»")
                cmd["redirs"].append((fd, mode, tokens[i + 1]))
                i += 1
        else:
            op = t[1]
            if not close_cmd():
                raise ShellSyntaxError(f"синтаксическая ошибка рядом с неожиданным маркером «{op}»")
            if op != "|":
                lists.append((pipeline, connector))
                pipeline = []
                connector = op
        i += 1
    if close_cmd():
        lists.append((pipeline, connector))
    elif pipeline:
        raise ShellSyntaxError("синтаксическая ошибка: неожиданный конец строки")
    elif connector in ("&&", "||"):
        raise ShellSyntaxError("синтаксическая ошибка: неожиданный конец строки")
    return lists


# ================================================================== I/O ===

class IO:
    def __init__(self, stdin, out, err):
        self.stdin = stdin
        self._out = out
        self._err = err

    def out(self, text):
        if text:
            self._out(text)

    def err(self, text):
        if text:
            self._err(text if text.endswith("\n") else text + "\n")


class Collector:
    def __init__(self):
        self.parts = []

    def __call__(self, text):
        self.parts.append(text)

    def text(self):
        return "".join(self.parts)


# =========================================================== контекст ===

class Ctx:
    def __init__(self, session, sandbox, hooks=None):
        self.session = session
        self.sb = sandbox
        self.priv = False
        self.wrote = False
        self.clear = False
        self.dispatches = 0
        self.output_size = 0
        self.subst_depth = 0
        self.hooks = hooks or {}
        self.status = session.get("last_status", 0)
        self.trace = []          # выполненные команды: для проверки заданий по журналу
        self.depth = 0
        self.script_depth = 0

    @property
    def cwd(self):
        return self.session["cwd"]

    def resolve(self, arg):
        return self.sb.resolve(self.cwd, arg)

    @property
    def env(self):
        return {
            "HOME": self.sb.home_display,
            "USER": self.sb.user,
            "LOGNAME": self.sb.user,
            "PWD": self.sb.display(self.cwd),
            "OLDPWD": self.session.get("oldpwd_display", ""),
            "SHELL": "/bin/bash",
            "HOSTNAME": "seclab",
            "?": str(self.status),
        }

    def read_input(self, cmd, name, io):
        """Содержимое файла-аргумента ('-' — stdin). None при ошибке (сообщение уже выведено)."""
        if name == "-":
            return io.stdin or ""
        try:
            text, binary = self.sb.read_text(self.resolve(name), self.priv)
        except FsError as e:
            io.err(f"{cmd}: {name}: {e}")
            return None
        return text

    def write_file(self, cmd, name, text, io, append=False, priv=None):
        try:
            self.sb.write_text(self.resolve(name), text, self.priv if priv is None else priv, append=append)
            self.wrote = True
            return True
        except FsError as e:
            io.err(f"{cmd}: {name}: {e}")
            return False

    # -------------------------------------------------- запуск команды ---

    def run_argv(self, argv, io, priv=None):
        """Запускает команду по готовому списку аргументов (для xargs, find -exec, sudo)."""
        self.dispatches += 1
        if self.dispatches > MAX_DISPATCH:
            io.err("превышен лимит запусков команд в одной строке")
            return 1
        if not argv:
            return 0
        name = argv[0]
        if "/" in name and posixpath.basename(name) in BIN_DIR:
            name = posixpath.basename(name)
        saved = self.priv
        if priv is not None:
            self.priv = priv
        entry = None
        if len(self.trace) < MAX_TRACE:
            entry = {"argv": [a[:300] for a in argv[:50]], "cwd": self.cwd, "priv": self.priv,
                     "depth": self.depth}
            self.trace.append(entry)
        self.depth += 1
        code = 1
        try:
            if name in EDITORS:
                io.err(f"{name}: интерактивные редакторы в учебном терминале недоступны.\n"
                       "Найдите нужную строку (grep -n) и измените её без открытия файла: sed -i 's/было/стало/' файл")
                code = 1
                return code
            fn = COMMANDS.get(name)
            if fn is None:
                if "/" in name:
                    code = run_script_file(self, name, argv, io, need_exec=True)
                    return code
                io.err(f'{name}: команда не найдена. Наберите "help".')
                code = 127
                return code
            code = fn(self, argv, io) or 0
            return code
        except FsError as e:
            io.err(f"{name}: {e}")
            code = 1
            return code
        except OSError as e:
            io.err(f"{name}: {e.strerror or e}")
            code = 1
            return code
        finally:
            self.depth -= 1
            self.priv = saved
            if entry is not None:
                entry["status"] = code
                entry["cwd_after"] = self.cwd


# ========================================================= раскрытие ===

def _glob_escape(text):
    return re.sub(r"([*?\[])", r"[\1]", text)


def _expand_glob(ctx, pattern):
    """Маска -> список путей в том же виде, как написан шаблон (отсортировано)."""
    absolute = pattern.startswith("/")
    segments = [s for s in pattern.split("/") if s != ""]
    if absolute:
        candidates = [("/", ctx.resolve("/"))]
    else:
        candidates = [("", ctx.cwd)]
    for k, seg in enumerate(segments):
        last = k == len(segments) - 1
        nxt = []
        has_magic = re.search(r"(?<!\[)[*?\[]", seg) is not None and not re.fullmatch(r"(\[[*?\[]\])+", seg)
        for shown, vrel in candidates:
            prefix = shown if shown in ("", "/") else shown + "/"
            if not has_magic:
                lit = re.sub(r"\[([*?\[])\]", r"\1", seg)
                try:
                    child = ctx.sb.resolve(vrel, lit)
                except FsError:
                    continue
                if ctx.sb.lexists(child) and (last or ctx.sb.isdir(child)):
                    nxt.append((prefix + lit, child))
                continue
            try:
                names = ctx.sb.listdir(vrel, ctx.priv)
            except (FsError, OSError):
                continue
            for name in names:
                if name.startswith(".") and not seg.startswith("."):
                    continue
                if fnmatch.fnmatchcase(name, seg):
                    child = f"{vrel}/{name}" if vrel else name
                    if last or ctx.sb.isdir(child):
                        nxt.append((prefix + name, child))
        candidates = nxt
        if not candidates:
            return []
    return sorted(shown for shown, _ in candidates)


def expand_word(ctx, word, run_subst):
    """Word -> список полей (после подстановок, разбиения и масок)."""
    fields = []
    cur_text = ""
    cur_pattern = ""
    cur_magic = False
    started = False
    first = True

    for kind, text, quoted in word.parts:
        if kind == "lit":
            if first and not quoted and (text == "~" or text.startswith("~/")):
                text = ctx.env["HOME"] + text[1:]
                cur_text += text
                cur_pattern += _glob_escape(text)
            else:
                cur_text += text
                if quoted:
                    cur_pattern += _glob_escape(text)
                else:
                    cur_pattern += text
                    if re.search(r"[*?\[]", text):
                        cur_magic = True
            started = True
        else:
            value = ctx.env.get(text, "") if kind == "var" else run_subst(text)
            if kind == "cmd":
                value = value.rstrip("\n")
            if quoted:
                cur_text += value
                cur_pattern += _glob_escape(value)
                started = True
            else:
                pieces = value.split()
                if value[:1].isspace() and started:
                    fields.append((cur_text, cur_pattern, cur_magic))
                    cur_text, cur_pattern, cur_magic, started = "", "", False, False
                for k, piece in enumerate(pieces):
                    if k > 0:
                        fields.append((cur_text, cur_pattern, cur_magic))
                        cur_text, cur_pattern, cur_magic = "", "", False
                    cur_text += piece
                    cur_pattern += piece
                    cur_magic = cur_magic or bool(re.search(r"[*?\[]", piece))
                    started = True
                if pieces and value[-1:].isspace():
                    fields.append((cur_text, cur_pattern, cur_magic))
                    cur_text, cur_pattern, cur_magic, started = "", "", False, False
        first = False
    if started:
        fields.append((cur_text, cur_pattern, cur_magic))

    out = []
    for text, pattern, magic in fields:
        if magic:
            matches = _expand_glob(ctx, pattern)
            if matches:
                out.extend(matches)
                continue
        out.append(text)
    return out


# ========================================================== выполнение ===

def run(ctx, line):
    """Выполняет командную строку. Возвращает текст для терминала."""
    events = []

    def term(text):
        ctx.output_size += len(text)
        if ctx.output_size > MAX_OUTPUT:
            raise OutputLimit()
        events.append(text)

    try:
        lists = parse(line)
    except ShellSyntaxError as e:
        ctx.status = 2
        return f"bash: {e}"
    try:
        for pipeline, connector in lists:
            if connector == "&&" and ctx.status != 0:
                continue
            if connector == "||" and ctx.status == 0:
                continue
            ctx.status = run_pipeline(ctx, pipeline, term, term)
    except OutputLimit:
        events.append("\n... (вывод обрезан: слишком много данных)")
    except ShellSyntaxError as e:
        events.append(f"bash: {e}")
        ctx.status = 2
    return "".join(events).rstrip("\n")


def _subst_runner(ctx, err_sink):
    def run_subst(cmdline):
        if ctx.subst_depth >= MAX_SUBST_DEPTH:
            raise ShellSyntaxError("слишком глубокая вложенность $(...)")
        ctx.subst_depth += 1
        try:
            out = Collector()
            saved = ctx.status
            for pipeline, connector in parse(cmdline):
                if connector == "&&" and ctx.status != 0:
                    continue
                if connector == "||" and ctx.status == 0:
                    continue
                ctx.status = run_pipeline(ctx, pipeline, out, err_sink)
            ctx.status = saved
            return out.text()
        finally:
            ctx.subst_depth -= 1
    return run_subst


def run_pipeline(ctx, pipeline, term_out, term_err):
    stdin = ""
    status = 0
    run_subst = _subst_runner(ctx, term_err)
    for k, cmd in enumerate(pipeline):
        last = k == len(pipeline) - 1
        argv = []
        for w in cmd["words"]:
            argv.extend(expand_word(ctx, w, run_subst))

        buffer = Collector()
        fds = {1: term_out if last else buffer, 2: term_err}
        file_sinks = []
        stage_stdin = stdin if k > 0 else ""
        ok = True
        for fd, mode, target_word in cmd["redirs"]:
            if mode.startswith("dup:"):
                src = int(mode[4:])
                fds[fd] = fds.get(src, term_err)
                continue
            targets = expand_word(ctx, target_word, run_subst)
            if len(targets) != 1:
                term_err("bash: неоднозначное перенаправление\n")
                ok = False
                break
            name = targets[0]
            if mode == "<":
                if name == "/dev/null":
                    stage_stdin = ""
                    continue
                try:
                    stage_stdin, _ = ctx.sb.read_text(ctx.resolve(name), False)
                except FsError as e:
                    term_err(f"bash: {name}: {e}\n")
                    ok = False
                    break
                continue
            if name == "/dev/null":
                sink = lambda text: None  # noqa: E731
            else:
                try:
                    vrel = ctx.resolve(name)
                    append = mode == ">>"
                    # Перенаправление делает шелл — без прав sudo.
                    ctx.sb.check_write(vrel, False)
                    if not append:
                        ctx.sb.write_text(vrel, "", False)
                    ctx.wrote = True
                except FsError as e:
                    term_err(f"bash: {name}: {e}\n")
                    ok = False
                    break
                sink = Collector()
                file_sinks.append((vrel, sink))
            if mode == "&>":
                fds[1] = fds[2] = sink
            else:
                fds[fd] = sink
        if not ok:
            status = 1
            stdin = ""
            continue

        io = IO(stage_stdin, fds[1], fds[2])
        if argv:
            status = ctx.run_argv(argv, io)
        else:
            status = 0
        for vrel, sink in file_sinks:
            try:
                ctx.sb.write_text(vrel, sink.text(), False, append=True)
            except FsError as e:
                term_err(f"bash: {ctx.sb.display(vrel)}: {e}\n")
        stdin = buffer.text()
    return status


# ====================================================== простые команды ===

def parse_short_flags(cmd, argv, allowed, io, with_value=""):
    """Разбор флагов вида -la -n 5 -n5. Возвращает (флаги dict, операнды) или None."""
    flags = {}
    operands = []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--":
            operands.extend(argv[i + 1:])
            break
        if a.startswith("-") and len(a) > 1:
            j = 1
            while j < len(a):
                ch = a[j]
                if ch in with_value:
                    val = a[j + 1:]
                    if not val:
                        i += 1
                        if i >= len(argv):
                            io.err(f"{cmd}: ключ требует аргумент -- «{ch}»")
                            return None
                        val = argv[i]
                    flags[ch] = val
                    break
                if ch not in allowed:
                    io.err(f"{cmd}: неверный ключ — «{ch}»")
                    return None
                flags[ch] = True
                j += 1
        else:
            operands.append(a)
        i += 1
    return flags, operands


def cmd_help(ctx, argv, io):
    io.out(HELP_TEXT + "\n")


def cmd_whoami(ctx, argv, io):
    io.out(("root" if ctx.priv else ctx.sb.user) + "\n")


def cmd_id(ctx, argv, io):
    if ctx.priv:
        io.out("uid=0(root) gid=0(root) группы=0(root)\n")
    else:
        u = ctx.sb.user
        io.out(f"uid=1000({u}) gid=1000({u}) группы=1000({u}),27(sudo)\n")


def cmd_date(ctx, argv, io):
    io.out(time.strftime("%a %b %d %Y %H:%M:%S GMT%z") + "\n")


def cmd_true(ctx, argv, io):
    return 0


def cmd_false(ctx, argv, io):
    return 1


def cmd_echo(ctx, argv, io):
    args = argv[1:]
    newline = True
    escapes = False
    while args and re.fullmatch(r"-[neE]+", args[0]):
        for ch in args[0][1:]:
            if ch == "n":
                newline = False
            elif ch == "e":
                escapes = True
            else:
                escapes = False
        args = args[1:]
    text = " ".join(args)
    if escapes:
        text = text.replace("\\\\", "\0").replace("\\n", "\n").replace("\\t", "\t").replace("\0", "\\")
    io.out(text + ("\n" if newline else ""))


def _printf_escapes(text):
    return (text.replace("\\\\", "\0").replace("\\n", "\n").replace("\\t", "\t")
            .replace("\\\"", '"').replace("\0", "\\"))


def cmd_printf(ctx, argv, io):
    if len(argv) < 2:
        io.err("printf: использование: printf ФОРМАТ [АРГУМЕНТ]...")
        return 1
    fmt = _printf_escapes(argv[1])
    args = argv[2:]
    specs = re.findall(r"%(?:%|[-0-9.]*[sdif])", fmt)
    if not args or not [s for s in specs if s != "%%"]:
        io.out(fmt.replace("%%", "%"))
        return 0
    out = []
    i = 0
    while True:
        def sub(m):
            nonlocal i
            spec = m.group(0)
            if spec == "%%":
                return "%"
            value = args[i] if i < len(args) else ""
            i += 1
            if spec[-1] in "di":
                try:
                    return ("%" + spec[1:-1] + "d") % int(value or 0)
                except ValueError:
                    return value
            if spec[-1] == "f":
                try:
                    return ("%" + spec[1:]) % float(value or 0)
                except ValueError:
                    return value
            return ("%" + spec[1:]) % value
        out.append(re.sub(r"%(?:%|[-0-9.]*[sdif])", sub, fmt))
        if i >= len(args):
            break
    io.out("".join(out))
    return 0


def cmd_pwd(ctx, argv, io):
    io.out(ctx.sb.display(ctx.cwd) + "\n")


def cmd_clear(ctx, argv, io):
    ctx.clear = True


def cmd_cd(ctx, argv, io):
    arg = argv[1] if len(argv) > 1 else None
    if arg is None or arg == "~":
        target = ctx.sb.home_vrel
    elif arg == "-":
        target = ctx.session.get("oldpwd")
        if target is None:
            io.err("cd: переменная OLDPWD не задана")
            return 1
        io.out(ctx.sb.display(target) + "\n")
    else:
        try:
            target = ctx.resolve(arg)
        except FsError as e:
            io.err(f"cd: {e}")
            return 1
        if not ctx.sb.exists(target):
            io.err(f"cd: {arg}: нет такого файла или каталога")
            return 1
        if not ctx.sb.isdir(target):
            io.err(f"cd: {arg}: это не каталог")
            return 1
        try:
            ctx.sb.check_traverse(target + "/x", ctx.priv)
        except FsError:
            io.err(f"cd: {arg}: Отказано в доступе")
            return 1
    ctx.session["oldpwd"] = ctx.cwd
    ctx.session["oldpwd_display"] = ctx.sb.display(ctx.cwd)
    ctx.session["cwd"] = target
    return 0


def _fmt_time(ts):
    t = time.localtime(ts)
    month = MONTHS[t.tm_mon - 1]
    if abs(time.time() - ts) < 182 * 86400:
        return f"{month} {t.tm_mday:>2} {t.tm_hour:02d}:{t.tm_min:02d}"
    return f"{month} {t.tm_mday:>2}  {t.tm_year}"


def _human(n):
    for unit in ("", "K", "M", "G"):
        if n < 1024 or unit == "G":
            if unit == "":
                return str(n)
            return (f"{n:.1f}" if n < 10 else f"{n:.0f}") + unit
        n /= 1024.0
    return str(n)


def _ls_long(ctx, vrel, name, human):
    s = ctx.sb.lstat(vrel)
    nbytes = len(ctx.sb.readlink(vrel).encode()) if ctx.sb.islink(vrel) else s.st_size
    size = _human(nbytes) if human else str(nbytes)
    owner = ctx.sb.owner(vrel)
    line = f"{vfs.mode_string(s.st_mode)} {s.st_nlink:>2} {owner} {owner} {size:>6} {_fmt_time(s.st_mtime)} {name}"
    if ctx.sb.islink(vrel):
        line += f" -> {ctx.sb.readlink(vrel)}"
    return line


def _ls_sort(ctx, vrel, names, flags):
    def path(x):
        return f"{vrel}/{x}" if vrel else x
    if "t" in flags:
        names = sorted(names, key=lambda x: -ctx.sb.lstat(path(x)).st_mtime)
    elif "S" in flags:
        names = sorted(names, key=lambda x: -ctx.sb.lstat(path(x)).st_size)
    if "r" in flags:
        names = list(reversed(names))
    return names


def _ls_name(ctx, vrel, name, flags):
    if "F" not in flags:
        return name
    if ctx.sb.islink(vrel):
        return name + "@"
    if ctx.sb.isdir(vrel):
        return name + "/"
    if ctx.sb.can(vrel, 1, False):
        return name + "*"
    return name


def cmd_ls(ctx, argv, io):
    parsed = parse_short_flags("ls", argv, "aAlhd1RFtSri", io)
    if parsed is None:
        return 2
    flags, operands = parsed
    show_all = "a" in flags or "A" in flags
    long = "l" in flags
    status = 0
    targets = operands or ["."]
    files, dirs = [], []
    for arg in targets:
        try:
            vrel = ctx.resolve(arg)
        except FsError as e:
            io.err(f"ls: {e}")
            status = 2
            continue
        if not ctx.sb.lexists(vrel):
            io.err(f"ls: невозможно получить доступ к '{arg}': Нет такого файла или каталога")
            status = 2
            continue
        if ctx.sb.isdir(vrel) and "d" not in flags and not (long and ctx.sb.islink(vrel) and not arg.endswith("/")):
            dirs.append((arg, vrel))
        else:
            files.append((arg, vrel))
    blocks = []
    if files:
        if long:
            blocks.append("\n".join(_ls_long(ctx, v, _ls_name(ctx, v, a, flags), "h" in flags) for a, v in files))
        else:
            blocks.append("  ".join(_ls_name(ctx, v, a, flags) for a, v in files))
    queue = list(dirs)
    many = len(dirs) + len(files) > 1 or "R" in flags
    while queue:
        arg, vrel = queue.pop(0)
        try:
            names = ctx.sb.listdir(vrel, ctx.priv)
        except FsError as e:
            io.err(f"ls: невозможно открыть каталог '{arg}': {e}")
            status = 2
            continue
        names = [x for x in names if show_all or not x.startswith(".")]
        names = _ls_sort(ctx, vrel, names, flags)
        if "a" in flags:
            names = [".", ".."] + names
        header = f"{arg}:\n" if many else ""

        def child(x):
            if x == ".":
                return vrel
            if x == "..":
                return vrel.rsplit("/", 1)[0] if "/" in vrel else ""
            return f"{vrel}/{x}" if vrel else x

        if long:
            total = sum((ctx.sb.lstat(child(x)).st_blocks for x in names)) // 2
            lines = [f"итого {total}"] + [_ls_long(ctx, child(x), _ls_name(ctx, child(x), x, flags), "h" in flags)
                                          for x in names]
            body = "\n".join(lines)
        elif not names:
            body = ""
        else:
            sep = "\n" if "1" in flags else "  "
            body = sep.join(_ls_name(ctx, child(x), x, flags) if "F" in flags
                            else x + ("/" if x not in (".", "..") and ctx.sb.isdir(child(x)) else "")
                            for x in names)
        blocks.append((header + body).rstrip("\n") if body or header else "")
        if "R" in flags:
            subs = [(f"{arg.rstrip('/')}/{x}" if arg != "/" else f"/{x}", child(x)) for x in names
                    if x not in (".", "..") and ctx.sb.isdir(child(x)) and not ctx.sb.islink(child(x))]
            queue = subs + queue
    blocks = [b for b in blocks if b != ""]
    if blocks:
        io.out("\n\n".join(blocks) + "\n")
    return status


def cmd_cat(ctx, argv, io):
    parsed = parse_short_flags("cat", argv, "nbAEs", io)
    if parsed is None:
        return 1
    flags, operands = parsed
    status = 0
    out = []
    for name in operands or ["-"]:
        if name == "-":
            text = io.stdin or ""
        else:
            try:
                vrel = ctx.resolve(name)
            except FsError as e:
                io.err(f"cat: {e}")
                status = 1
                continue
            if not ctx.sb.lexists(vrel) or not ctx.sb.exists(vrel):
                io.err(f"cat: {name}: нет такого файла")
                status = 1
                continue
            try:
                text, binary = ctx.sb.read_text(vrel, ctx.priv)
            except FsError as e:
                io.err(f"cat: {name}: {e}")
                status = 1
                continue
            if binary:
                io.err(f"cat: {name}: двоичный файл")
                status = 1
                continue
        out.append(text)
    text = "".join(out)
    if "n" in flags or "b" in flags or "E" in flags or "A" in flags:
        lines = text.split("\n")
        trailing = text.endswith("\n")
        if trailing:
            lines = lines[:-1]
        res = []
        num = 0
        for line in lines:
            shown = line + ("$" if ("E" in flags or "A" in flags) else "")
            if "b" in flags and line == "":
                res.append(shown)
                continue
            if "n" in flags or "b" in flags:
                num += 1
                shown = f"{num:>6}\t{shown}"
            res.append(shown)
        text = "\n".join(res) + ("\n" if trailing else "")
    io.out(text)
    return status


def _split_lines(text):
    lines = text.split("\n")
    if text.endswith("\n"):
        lines = lines[:-1]
    return lines


def _head_tail(ctx, argv, io, is_head):
    cmd = "head" if is_head else "tail"
    args = list(argv)
    # -5 => -n 5
    args = [("-n" + a[1:]) if re.fullmatch(r"-\d+", a) else a for a in args]
    parsed = parse_short_flags(cmd, args, "qvf", io, with_value="nc")
    if parsed is None:
        return 1
    flags, operands = parsed
    count = flags.get("n", "10")
    from_start = False
    if isinstance(count, str) and count.startswith("+"):
        from_start = True
        count = count[1:]
    try:
        n = int(count)
    except ValueError:
        io.err(f"{cmd}: неверное число строк: «{flags.get('n')}»")
        return 1
    names = operands or ["-"]
    status = 0
    for k, name in enumerate(names):
        text = ctx.read_input(cmd, name, io)
        if text is None:
            status = 1
            continue
        if len(names) > 1 and "q" not in flags or "v" in flags:
            io.out(("\n" if k else "") + f"==> {name if name != '-' else 'стандартный ввод'} <==\n")
        if "c" in flags:
            c = int(flags["c"])
            io.out(text[:c] if is_head else text[-c:])
            continue
        lines = _split_lines(text)
        if is_head:
            part = lines[:n] if n >= 0 else lines[:n]
        elif from_start:
            part = lines[max(n - 1, 0):]
        else:
            part = lines[-n:] if n > 0 else []
        if part:
            io.out("\n".join(part) + "\n")
    return status


def cmd_head(ctx, argv, io):
    return _head_tail(ctx, argv, io, True)


def cmd_tail(ctx, argv, io):
    return _head_tail(ctx, argv, io, False)


def cmd_wc(ctx, argv, io):
    parsed = parse_short_flags("wc", argv, "lwcm", io)
    if parsed is None:
        return 1
    flags, operands = parsed
    want = [k for k in "lwc" if k in flags or (k == "c" and "m" in flags)] or ["l", "w", "c"]
    rows = []
    status = 0
    for name in operands or ["-"]:
        text = ctx.read_input("wc", name, io)
        if text is None:
            status = 1
            continue
        counts = {"l": text.count("\n"), "w": len(text.split()),
                  "c": len(text) if "m" in flags else len(text.encode("utf-8"))}
        rows.append(([counts[k] for k in want], "" if name == "-" else name))
    if len(rows) > 1:
        rows.append(([sum(r[0][i] for r in rows) for i in range(len(want))], "итого"))
    if len(rows) == 1 and len(want) == 1 and not rows[0][1]:
        io.out(f"{rows[0][0][0]}\n")
        return status
    width = max(len(str(v)) for r in rows for v in r[0]) if rows else 1
    width = max(width, 1 if len(want) == 1 else 7)
    for nums, name in rows:
        io.out(" ".join(f"{v:>{width}}" for v in nums) + (f" {name}" if name else "") + "\n")
    return status


def cmd_sort(ctx, argv, io):
    parsed = parse_short_flags("sort", argv, "rnufb", io, with_value="kt")
    if parsed is None:
        return 2
    flags, operands = parsed
    lines = []
    for name in operands or ["-"]:
        text = ctx.read_input("sort", name, io)
        if text is None:
            return 2
        lines.extend(_split_lines(text))

    def key(line):
        value = line
        if "k" in flags:
            field = int(str(flags["k"]).split(",")[0].split(".")[0]) - 1
            parts = line.split(flags["t"]) if "t" in flags else line.split()
            value = parts[field] if field < len(parts) else ""
        if "b" in flags:
            value = value.lstrip()
        if "n" in flags:
            m = re.match(r"\s*-?\d+(\.\d+)?", value)
            return (float(m.group(0)) if m else 0.0, value)
        return value.lower() if "f" in flags else value

    lines.sort(key=key, reverse="r" in flags)
    if "u" in flags:
        seen = set()
        uniq = []
        for line in lines:
            k = key(line)
            if k not in seen:
                seen.add(k)
                uniq.append(line)
        lines = uniq
    if lines:
        io.out("\n".join(lines) + "\n")


def cmd_uniq(ctx, argv, io):
    parsed = parse_short_flags("uniq", argv, "cdui", io)
    if parsed is None:
        return 1
    flags, operands = parsed
    text = ctx.read_input("uniq", operands[0] if operands else "-", io)
    if text is None:
        return 1
    groups = []
    for line in _split_lines(text):
        k = line.lower() if "i" in flags else line
        if groups and groups[-1][0] == k:
            groups[-1][2] += 1
        else:
            groups.append([k, line, 1])
    res = []
    for _, line, cnt in groups:
        if "d" in flags and cnt < 2 or "u" in flags and cnt > 1:
            continue
        res.append(f"{cnt:>7} {line}" if "c" in flags else line)
    if res:
        io.out("\n".join(res) + "\n")


def _ranges(spec):
    out = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-", 1)
            out.append((int(a) if a else 1, int(b) if b else 10 ** 9))
        else:
            out.append((int(part), int(part)))
    return out


def cmd_cut(ctx, argv, io):
    parsed = parse_short_flags("cut", argv, "s", io, with_value="dfc")
    if parsed is None:
        return 1
    flags, operands = parsed
    if "f" not in flags and "c" not in flags:
        io.err("cut: нужно указать список байтов, символов или полей (-f или -c)")
        return 1
    try:
        ranges = _ranges(flags.get("f") or flags.get("c"))
    except ValueError:
        io.err("cut: неверный список полей")
        return 1
    delim = flags.get("d", "\t")
    res = []
    for name in operands or ["-"]:
        text = ctx.read_input("cut", name, io)
        if text is None:
            return 1
        for line in _split_lines(text):
            if "c" in flags:
                res.append("".join(ch for i, ch in enumerate(line, 1) if any(a <= i <= b for a, b in ranges)))
                continue
            if delim not in line:
                if "s" not in flags:
                    res.append(line)
                continue
            fields = line.split(delim)
            res.append(delim.join(f for i, f in enumerate(fields, 1) if any(a <= i <= b for a, b in ranges)))
    if res:
        io.out("\n".join(res) + "\n")


def cmd_tee(ctx, argv, io):
    parsed = parse_short_flags("tee", argv, "a", io)
    if parsed is None:
        return 1
    flags, operands = parsed
    data = io.stdin or ""
    status = 0
    for name in operands:
        if name == "/dev/null":
            continue
        if not ctx.write_file("tee", name, data, io, append="a" in flags):
            status = 1
    io.out(data)
    return status


def cmd_touch(ctx, argv, io):
    status = 0
    for name in [a for a in argv[1:] if not a.startswith("-")]:
        try:
            vrel = ctx.resolve(name)
            if ctx.sb.lexists(vrel):
                ctx.sb.check_write(vrel, ctx.priv)
                os.utime(ctx.sb.path(vrel))
            else:
                ctx.sb.write_text(vrel, "", ctx.priv)
            ctx.wrote = True
        except FsError as e:
            io.err(f"touch: невозможно выполнить touch для '{name}': {e}")
            status = 1
    return status


def cmd_diff(ctx, argv, io):
    parsed = parse_short_flags("diff", argv, "uqiwb", io)
    if parsed is None:
        return 2
    flags, operands = parsed
    if len(operands) != 2:
        io.err("diff: ожидаются два файла")
        return 2
    texts = []
    for name in operands:
        t = ctx.read_input("diff", name, io)
        if t is None:
            return 2
        texts.append(t)
    a, b = (_split_lines(t) for t in texts)

    def norm(lines):
        res = lines
        if "i" in flags:
            res = [x.lower() for x in res]
        if "w" in flags:
            res = [re.sub(r"\s+", "", x) for x in res]
        elif "b" in flags:
            res = [re.sub(r"\s+", " ", x).rstrip() for x in res]
        return res

    na, nb = norm(a), norm(b)
    if na == nb:
        return 0
    if "q" in flags:
        io.out(f"Файлы {operands[0]} и {operands[1]} различаются\n")
        return 1
    if "u" in flags:
        out = list(difflib.unified_diff(a, b, operands[0], operands[1], lineterm=""))
        io.out("\n".join(out) + "\n")
        return 1
    sm = difflib.SequenceMatcher(a=na, b=nb, autojunk=False)
    res = []

    def rng(lo, hi):
        return str(lo + 1) if hi - lo == 1 else (f"{lo + 1},{hi}" if hi > lo else str(lo))

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag == "replace":
            res.append(f"{rng(i1, i2)}c{rng(j1, j2)}")
            res.extend("< " + x for x in a[i1:i2])
            res.append("---")
            res.extend("> " + x for x in b[j1:j2])
        elif tag == "delete":
            res.append(f"{rng(i1, i2)}d{j1}")
            res.extend("< " + x for x in a[i1:i2])
        else:
            res.append(f"{i1}a{rng(j1, j2)}")
            res.extend("> " + x for x in b[j1:j2])
    io.out("\n".join(res) + "\n")
    return 1


def cmd_stat(ctx, argv, io):
    status = 0
    for name in [a for a in argv[1:] if not a.startswith("-")] or []:
        try:
            vrel = ctx.resolve(name)
            if not ctx.sb.lexists(vrel):
                raise FsError(vfs.ENOENT)
            s = ctx.sb.lstat(vrel)
        except FsError as e:
            io.err(f"stat: не удалось выполнить stat для '{name}': {e}")
            status = 1
            continue
        kind = "каталог" if ctx.sb.isdir(vrel) and not ctx.sb.islink(vrel) else \
            "символьная ссылка" if ctx.sb.islink(vrel) else \
            "обычный пустой файл" if s.st_size == 0 else "обычный файл"
        owner = ctx.sb.owner(vrel)
        uid = ctx.sb.uid(vrel)
        mode = vfs.mode_string(s.st_mode)
        shown = name + (f" -> {ctx.sb.readlink(vrel)}" if ctx.sb.islink(vrel) else "")
        io.out(
            f"  Файл: {shown}\n"
            f"  Размер: {s.st_size}\tБлоков: {s.st_blocks}\t{kind}\n"
            f"Доступ: ({oct(s.st_mode & 0o7777)[2:].zfill(4)}/{mode})  Uid: ({uid:>5}/{owner:>8})  Gid: ({uid:>5}/{owner:>8})\n"
            f"Изменён: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(s.st_mtime))}\n"
        )
    return status


def _xargs_split(text):
    items = []
    cur = ""
    has = False
    i = 0
    quote = None
    while i < len(text):
        c = text[i]
        if quote:
            if c == quote:
                quote = None
            else:
                cur += c
        elif c in "'\"":
            quote = c
            has = True
        elif c == "\\" and i + 1 < len(text):
            cur += text[i + 1]
            has = True
            i += 1
        elif c.isspace():
            if has or cur:
                items.append(cur)
            cur, has = "", False
        else:
            cur += c
            has = True
        i += 1
    if has or cur:
        items.append(cur)
    return items


def cmd_xargs(ctx, argv, io):
    i = 1
    max_args = None
    replace = None
    null = False
    delim = None
    no_empty = False
    trace = False
    while i < len(argv) and argv[i].startswith("-") and argv[i] != "-":
        a = argv[i]
        if a == "--":
            i += 1
            break
        if a in ("-0", "--null"):
            null = True
        elif a in ("-r", "--no-run-if-empty"):
            no_empty = True
        elif a in ("-t", "--verbose"):
            trace = True
        elif a.startswith("-n"):
            val = a[2:] or (argv[i + 1] if i + 1 < len(argv) else "")
            if not a[2:]:
                i += 1
            max_args = int(val)
        elif a.startswith("-I"):
            replace = a[2:] or argv[i + 1]
            if not a[2:]:
                i += 1
            max_args = 1
        elif a.startswith("-i"):
            replace = a[2:] or "{}"
            max_args = 1
        elif a.startswith("-d"):
            val = a[2:] or argv[i + 1]
            if not a[2:]:
                i += 1
            delim = val.encode().decode("unicode_escape")
        else:
            io.err(f"xargs: неверный ключ — «{a}»")
            return 1
        i += 1
    command = argv[i:] or ["echo"]
    data = io.stdin or ""
    if null:
        items = [x for x in data.split("\0") if x != ""]
    elif delim is not None:
        items = [x for x in data.split(delim)]
        if items and items[-1] in ("", "\n"):
            items.pop()
    elif replace is not None:
        items = [line for line in data.split("\n") if line.strip()]
    else:
        items = _xargs_split(data)
    if not items:
        if no_empty or replace is not None:
            return 0
        batches = [[]]
    else:
        size = max_args or len(items)
        batches = [items[k:k + size] for k in range(0, len(items), size)]
    status = 0
    for batch in batches:
        if replace is not None:
            run_argv = [x.replace(replace, batch[0]) for x in command]
        else:
            run_argv = command + batch
        if trace:
            io.err(" ".join(run_argv))
        code = ctx.run_argv(run_argv, IO("", io.out, io.err))
        if code != 0:
            status = 123 if code < 125 else code
    return status


def cmd_sudo(ctx, argv, io):
    args = argv[1:]
    while args and args[0].startswith("-"):
        if args[0] in ("-i", "-s", "-su"):
            io.err("sudo: интерактивная оболочка root в учебном терминале недоступна — запускайте отдельные команды: sudo <команда>")
            return 1
        if args[0] == "-l":
            io.out(f"Пользователь {ctx.sb.user} может выполнять на seclab следующие команды:\n    (ALL : ALL) ALL\n")
            return 0
        if args[0] == "-u":
            if len(args) < 2 or args[1] != "root":
                io.err("sudo: в учебном терминале поддерживается только -u root")
                return 1
            args = args[2:]
            continue
        args = args[1:]
    if not args:
        io.err("использование: sudo команда [аргументы]")
        return 1
    if args[0] in ("su", "bash", "sh", "-i"):
        io.err("sudo: интерактивная оболочка root в учебном терминале недоступна — запускайте отдельные команды: sudo <команда>")
        return 1
    return ctx.run_argv(args, io, priv=True)


def cmd_which(ctx, argv, io):
    status = 0
    for name in argv[1:]:
        if name in BIN_DIR:
            io.out(BIN_DIR[name] + "\n")
        else:
            status = 1
    return status


def cmd_check(ctx, argv, io):
    hook = ctx.hooks.get("check")
    if not hook:
        io.err("check: в этом задании проверка выполняется автоматически")
        return 1
    io.out(hook() + "\n")
    return 0


def cmd_man(ctx, argv, io):
    import manpages
    if len(argv) < 2:
        io.err("Какая справочная страница вам нужна? Например: man find")
        return 1
    page = manpages.PAGES.get(argv[1])
    if not page:
        io.err(f"Нет справочной страницы для {argv[1]}")
        return 16
    io.out(page.strip("\n") + "\n")


def cmd_less(ctx, argv, io):
    """less/more: в учебном терминале нет постраничного просмотра — файл выводится целиком."""
    args = [a for a in argv[1:] if not a.startswith("-") or a == "-"]
    return cmd_cat(ctx, ["cat"] + args, io)


def cmd_hostname(ctx, argv, io):
    io.out("seclab\n")


UNAME = {"s": "Linux", "n": "seclab", "r": "6.1.0-18-amd64",
         "v": "#1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1 (2024-02-01)", "m": "x86_64", "o": "GNU/Linux"}


def cmd_uname(ctx, argv, io):
    parsed = parse_short_flags("uname", argv, "asnrvmo", io)
    if parsed is None:
        return 1
    flags, _ = parsed
    keys = "snrvmo" if "a" in flags else [k for k in "snrvmo" if k in flags] or ["s"]
    io.out(" ".join(UNAME[k] for k in keys) + "\n")


def cmd_printenv(ctx, argv, io):
    env = {k: v for k, v in ctx.env.items() if k != "?"}
    env.update({"LANG": "ru_RU.UTF-8", "TERM": "xterm-256color",
                "PATH": "/usr/local/bin:/usr/bin:/bin"})
    if len(argv) > 1 and argv[0] == "printenv":
        status = 0
        for name in argv[1:]:
            if name in env:
                io.out(env[name] + "\n")
            else:
                status = 1
        return status
    io.out("".join(f"{k}={v}\n" for k, v in sorted(env.items())))


# ------------------------------------------------------------- скрипты ---

def run_script_file(ctx, name, argv, io, need_exec):
    """./script.sh (нужен бит x) или bash script.sh: строки выполняются этим же эмулятором."""
    shown = "bash" if not need_exec else "bash"
    try:
        vrel = ctx.resolve(name)
    except FsError as e:
        io.err(f"{shown}: {name}: {e}")
        return 127
    if not ctx.sb.lexists(vrel) or not ctx.sb.exists(vrel):
        io.err(f"{shown}: {name}: Нет такого файла или каталога")
        return 127
    if ctx.sb.isdir(vrel):
        io.err(f"{shown}: {name}: Это каталог")
        return 126
    if need_exec and not ctx.sb.can(vrel, 1, ctx.priv):
        io.err(f"{shown}: {name}: Отказано в доступе")
        return 126
    try:
        text, binary = ctx.sb.read_text(vrel, ctx.priv)
    except FsError as e:
        io.err(f"{shown}: {name}: {e}")
        return 126
    if binary:
        io.err(f"{shown}: {name}: невозможно запустить двоичный файл")
        return 126
    if ctx.script_depth >= MAX_SCRIPT_DEPTH:
        io.err(f"{shown}: {name}: слишком глубокая вложенность скриптов")
        return 1
    ctx.script_depth += 1
    saved_cwd = ctx.session["cwd"]
    status = 0
    try:
        for raw in text.split("\n"):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if re.fullmatch(r"exit(\s+\d+)?", line):
                status = int(line.split()[1]) if " " in line else status
                break
            try:
                for pipeline, connector in parse(line):
                    if connector == "&&" and status != 0:
                        continue
                    if connector == "||" and status == 0:
                        continue
                    status = run_pipeline(ctx, pipeline, io._out, io._err)
                    ctx.status = status
            except ShellSyntaxError as e:
                io.err(f"{name}: {e}")
                status = 2
    finally:
        ctx.script_depth -= 1
        ctx.session["cwd"] = saved_cwd  # cd внутри скрипта не меняет каталог вызывающего шелла
    return status


def cmd_bash(ctx, argv, io):
    args = [a for a in argv[1:] if a not in ("-e", "-x", "-v")]
    if not args:
        io.err(f"{argv[0]}: интерактивная оболочка уже запущена — укажите скрипт: {argv[0]} script.sh")
        return 1
    if args[0] == "-c":
        if len(args) < 2:
            io.err(f"{argv[0]}: -c: требуется аргумент")
            return 2
        status = 0
        for pipeline, connector in parse(args[1]):
            if connector == "&&" and status != 0:
                continue
            if connector == "||" and status == 0:
                continue
            status = run_pipeline(ctx, pipeline, io._out, io._err)
        return status
    return run_script_file(ctx, args[0], argv, io, need_exec=False)


# ------------------------------------------------------------- история ---

def history_list(session):
    return session.setdefault("history", [])


def add_history(session, line):
    hist = history_list(session)
    if line.strip() and not (hist and hist[-1] == line):
        hist.append(line)
        del hist[:-MAX_HISTORY]


def expand_history(session, line):
    """!!, !N, !-N, !строка (вне одинарных кавычек) -> (новая строка, ошибка | None)."""
    hist = history_list(session)
    offset = session.get("history_offset", 0)
    out = []
    i = 0
    quote = None
    while i < len(line):
        c = line[i]
        if quote == "'":
            out.append(c)
            if c == "'":
                quote = None
            i += 1
            continue
        if c == "\\" and i + 1 < len(line):
            out.append(line[i:i + 2])
            i += 2
            continue
        if c == "'" and quote is None:
            quote = "'"
            out.append(c)
            i += 1
            continue
        if c == '"':
            quote = None if quote == '"' else '"'
        if c == "!" and i + 1 < len(line):
            rest = line[i + 1:]
            m = re.match(r"!|-?\d+|[A-Za-z_./][\w./-]*", rest)
            if m:
                token = m.group(0)
                if token == "!":
                    found = hist[-1] if hist else None
                elif re.fullmatch(r"-?\d+", token):
                    n = int(token)
                    idx = len(hist) + n if n < 0 else n - 1 - offset
                    found = hist[idx] if 0 <= idx < len(hist) and n != 0 else None
                else:
                    found = next((h for h in reversed(hist) if h.startswith(token)), None)
                if found is None:
                    return None, f"bash: !{token}: событие не найдено"
                out.append(found)
                i += 1 + len(token)
                continue
        out.append(c)
        i += 1
    return "".join(out), None


def cmd_history(ctx, argv, io):
    hist = history_list(ctx.session)
    offset = ctx.session.get("history_offset", 0)
    args = argv[1:]
    if args and args[0] == "-c":
        ctx.session["history_offset"] = offset + len(hist)
        hist.clear()
        return 0
    items = list(enumerate(hist, offset + 1))
    if args:
        try:
            items = items[-int(args[0]):] if int(args[0]) > 0 else []
        except ValueError:
            io.err(f"bash: history: {args[0]}: требуется числовой аргумент")
            return 1
    io.out("".join(f"{n:>5}  {line}\n" for n, line in items))
    return 0


# ---------------------------------------------------------- дополнение ---

def complete(ctx, line):
    """Tab: дополнение имени команды или пути в конце строки.
    -> {"line": новая строка, "options": [варианты, если их несколько]}."""
    m = re.search(r"(?:^|[\s|;&<>])([^\s|;&<>'\"]*)$", line)
    word = m.group(1) if m else ""
    head = line[: len(line) - len(word)]
    before = head.rstrip()
    first = before == "" or before[-1] in "|;&" or re.fullmatch(r"(.*[\s|;&])?(sudo|which|xargs)", before) is not None
    after_man = re.fullmatch(r"(.*[\s|;&])?man", before) is not None
    if (first or after_man) and "/" not in word:
        names = set(COMMANDS) | {"sqlite3", "logout", "exit", "cd"}
        if after_man:
            import manpages
            names = set(manpages.PAGES)
        names = sorted(names)
        matches = [n for n in names if n.startswith(word)]
        suffix = {n: " " for n in matches}
    else:
        if word.startswith("~"):
            expanded = ctx.env["HOME"] + word[1:]
        else:
            expanded = word
        dir_part, _, prefix = expanded.rpartition("/")
        shown_dir = word[: len(word) - len(prefix)]
        base = dir_part + "/" if "/" in expanded else "."
        if expanded.startswith("/") and dir_part == "":
            base = "/"
        try:
            vrel = ctx.resolve(base)
            names = ctx.sb.listdir(vrel, ctx.priv)
        except FsError:
            return {"line": line, "options": []}
        matches = [n for n in names if n.startswith(prefix) and (prefix.startswith(".") or not n.startswith("."))]
        suffix = {}
        for n in matches:
            child = f"{vrel}/{n}" if vrel else n
            suffix[n] = "/" if ctx.sb.isdir(child) else " "
        matches = [shown_dir + n for n in matches]
        suffix = {shown_dir + n: s for n, s in suffix.items()}
    if not matches:
        return {"line": line, "options": []}
    if len(matches) == 1:
        only = matches[0]
        return {"line": head + only + suffix[only], "options": []}
    common = os.path.commonprefix(matches)
    if len(common) > len(word):
        return {"line": head + common, "options": []}
    return {"line": line, "options": [posixpath.basename(x.rstrip("/")) + ("/" if suffix[x] == "/" else "")
                                      for x in matches]}


def cmd_answer(ctx, argv, io):
    hook = ctx.hooks.get("answer")
    if not hook:
        io.err("answer: в этом задании ответы не принимаются")
        return 1
    text, ok = hook(argv[1:])
    (io.out if ok else io.err)(text + "\n")
    return 0 if ok else 1


def cmd_task(ctx, argv, io):
    hook = ctx.hooks.get("task")
    if not hook:
        io.err("task: условие задания — cat ~/TASK.md")
        return 1
    io.out(hook(argv[1:]) + "\n")
    return 0


def _lazy(module, func):
    def call(ctx, argv, io):
        mod = __import__(module)
        return getattr(mod, func)(ctx, argv, io)
    return call


COMMANDS = {
    "help": cmd_help,
    "whoami": cmd_whoami,
    "id": _lazy("cmd_admin", "cmd_id"),
    "date": cmd_date,
    "echo": cmd_echo,
    "pwd": cmd_pwd,
    "clear": cmd_clear,
    "cd": cmd_cd,
    "ls": cmd_ls,
    "cat": cmd_cat,
    "head": cmd_head,
    "tail": cmd_tail,
    "wc": cmd_wc,
    "sort": cmd_sort,
    "uniq": cmd_uniq,
    "cut": cmd_cut,
    "tee": cmd_tee,
    "touch": cmd_touch,
    "diff": cmd_diff,
    "stat": cmd_stat,
    "xargs": cmd_xargs,
    "sudo": cmd_sudo,
    "which": cmd_which,
    "man": cmd_man,
    "true": cmd_true,
    "false": cmd_false,
    "check": cmd_check,
    "find": _lazy("cmd_find", "cmd_find"),
    "grep": _lazy("cmd_grep", "cmd_grep"),
    "egrep": _lazy("cmd_grep", "cmd_egrep"),
    "fgrep": _lazy("cmd_grep", "cmd_fgrep"),
    "sed": _lazy("cmd_sed", "cmd_sed"),
    "mkdir": _lazy("cmd_files", "cmd_mkdir"),
    "rmdir": _lazy("cmd_files", "cmd_rmdir"),
    "rm": _lazy("cmd_files", "cmd_rm"),
    "mv": _lazy("cmd_files", "cmd_mv"),
    "cp": _lazy("cmd_files", "cmd_cp"),
    "chmod": _lazy("cmd_files", "cmd_chmod"),
    "ln": _lazy("cmd_files", "cmd_ln"),
    "readlink": _lazy("cmd_files", "cmd_readlink"),
    "file": _lazy("cmd_files", "cmd_file"),
    "basename": _lazy("cmd_files", "cmd_basename"),
    "dirname": _lazy("cmd_files", "cmd_dirname"),
    "tree": _lazy("cmd_files", "cmd_tree"),
    "less": cmd_less,
    "more": cmd_less,
    "hostname": cmd_hostname,
    "uname": cmd_uname,
    "env": cmd_printenv,
    "printenv": cmd_printenv,
    "bash": cmd_bash,
    "sh": cmd_bash,
    "source": lambda ctx, argv, io: run_script_file(ctx, argv[1], argv, io, False) if len(argv) > 1 else 2,
    ".": lambda ctx, argv, io: run_script_file(ctx, argv[1], argv, io, False) if len(argv) > 1 else 2,
    "history": cmd_history,
    "printf": cmd_printf,
    "answer": cmd_answer,
    "task": cmd_task,
    "groups": _lazy("cmd_admin", "cmd_groups"),
    "getent": _lazy("cmd_admin", "cmd_getent"),
    "passwd": _lazy("cmd_admin", "cmd_passwd"),
    "usermod": _lazy("cmd_admin", "cmd_usermod"),
    "gpasswd": _lazy("cmd_admin", "cmd_gpasswd"),
    "deluser": _lazy("cmd_admin", "cmd_deluser"),
    "last": _lazy("cmd_admin", "cmd_last"),
    "lastb": _lazy("cmd_admin", "cmd_lastb"),
    "sha256sum": _lazy("cmd_admin", "cmd_sha256sum"),
    "md5sum": _lazy("cmd_admin", "cmd_md5sum"),
    "systemctl": _lazy("cmd_admin", "cmd_systemctl"),
    "journalctl": _lazy("cmd_admin", "cmd_journalctl"),
    "sshd": _lazy("cmd_admin", "cmd_sshd"),
    "ssh": _lazy("cmd_admin", "cmd_ssh"),
    "ssh-keygen": _lazy("cmd_admin", "cmd_ssh_keygen"),
}
