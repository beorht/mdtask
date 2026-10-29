"""
find для эмулятора терминала — поведение как у GNU find.

  find [-H] [-L] [-P] [путь...] [выражение]

Параметры: -maxdepth -mindepth -depth -d -xdev -mount -noleaf -daystart -follow
           -regextype -ignore_readdir_race -warn -nowarn
Проверки:  -name -iname -path -ipath -wholename -iwholename -regex -iregex -lname -ilname
           -type -xtype -size -empty -mtime -mmin -atime -amin -ctime -cmin -newer
           -anewer -cnewer -user -group -uid -gid -nouser -nogroup -perm -readable
           -writable -executable -links -samefile -inum -true -false
Действия:  -print -print0 -printf -ls -exec -execdir (… ; и … {} +) -delete -prune -quit
Операторы: ( выражение )  ! -not  -a -and  -o -or  ,
"""

import fnmatch
import math
import os
import posixpath
import re
import stat as st
import time

import posixre
import vfs
from shell import IO
from vfs import FsError

MAX_VISITS = 100_000

GLOBAL_OPTS = {"-maxdepth", "-mindepth", "-depth", "-d", "-xdev", "-mount", "-noleaf", "-daystart",
               "-follow", "-regextype", "-ignore_readdir_race", "-noignore_readdir_race", "-warn", "-nowarn"}
TAKES_ARG = {"-name", "-iname", "-path", "-ipath", "-wholename", "-iwholename", "-regex", "-iregex",
             "-lname", "-ilname", "-type", "-xtype", "-size", "-mtime", "-mmin", "-atime", "-amin",
             "-ctime", "-cmin", "-newer", "-anewer", "-cnewer", "-user", "-group", "-uid", "-gid",
             "-perm", "-links", "-samefile", "-inum", "-printf", "-maxdepth", "-mindepth", "-regextype",
             "-fprint", "-fprintf", "-fls", "-used"}


class FindError(Exception):
    pass


class Quit(Exception):
    pass


class Entry:
    __slots__ = ("shown", "vrel", "depth", "start", "pruned", "_lst", "_st")

    def __init__(self, shown, vrel, depth, start):
        self.shown = shown
        self.vrel = vrel
        self.depth = depth
        self.start = start
        self.pruned = False
        self._lst = None
        self._st = None


def _num_cmp(spec, name):
    """'+N' / '-N' / 'N' -> функция сравнения целого значения."""
    m = re.fullmatch(r"([+-]?)(\d+)", spec)
    if not m:
        raise FindError(f"find: неверный аргумент «{spec}» для «{name}»")
    sign, n = m.group(1), int(m.group(2))
    if sign == "+":
        return lambda v: v > n
    if sign == "-":
        return lambda v: v < n
    return lambda v: v == n


SIZE_UNITS = {"b": 512, "c": 1, "w": 2, "k": 1024, "M": 1024 ** 2, "G": 1024 ** 3}


def _parse_perm(spec):
    """'644' / '-u=rw' / '/o+w' / 'u=rwx,g=rx' -> (режим, вид: exact|all|any)."""
    kind = "exact"
    if spec[:1] == "-":
        kind, spec = "all", spec[1:]
    elif spec[:1] == "/":
        kind, spec = "any", spec[1:]
    elif spec[:1] == "+":
        kind, spec = "any", spec[1:]
    if re.fullmatch(r"[0-7]{1,4}", spec):
        return int(spec, 8), kind
    mode = 0
    for clause in spec.split(","):
        m = re.fullmatch(r"([ugoa]*)([-+=])([rwxXst]*)", clause)
        if not m:
            raise FindError(f"find: неверный режим «{spec}»")
        who, op, perms = m.groups()
        who = who or "a"
        bits = 0
        for p in perms:
            base = {"r": 4, "w": 2, "x": 1, "X": 1}.get(p, 0)
            for w in ("u", "g", "o"):
                if w in who or "a" in who:
                    bits |= base << {"u": 6, "g": 3, "o": 0}[w]
            if p == "s":
                if "u" in who or "a" in who:
                    bits |= 0o4000
                if "g" in who or "a" in who:
                    bits |= 0o2000
            if p == "t":
                bits |= 0o1000
        if op == "-":
            mode &= ~bits
        else:
            mode |= bits
    return mode, kind


def _type_char(mode):
    if st.S_ISDIR(mode):
        return "d"
    if st.S_ISLNK(mode):
        return "l"
    if st.S_ISREG(mode):
        return "f"
    if st.S_ISFIFO(mode):
        return "p"
    if st.S_ISSOCK(mode):
        return "s"
    if st.S_ISBLK(mode):
        return "b"
    if st.S_ISCHR(mode):
        return "c"
    return "?"


class Finder:
    def __init__(self, ctx, io):
        self.ctx = ctx
        self.sb = ctx.sb
        self.io = io
        self.follow = False
        self.follow_start = False
        self.maxdepth = None
        self.mindepth = 0
        self.depth_first = False
        self.daystart = False
        self.regextype = "emacs"
        self.status = 0
        self.visits = 0
        self.batches = []          # (команда, execdir, собранные пути)
        self.now = time.time()
        self.has_action = False
        self.saw_test = None

    # -------------------------------------------------------- stat ---

    def lst(self, e):
        if e._lst is None:
            e._lst = self.sb.lstat(e.vrel)
        return e._lst

    def stt(self, e):
        if e._st is None:
            try:
                e._st = self.sb.stat(e.vrel)
            except OSError:
                e._st = self.lst(e)
        return e._st

    def meta(self, e):
        return self.stt(e) if self.follow else self.lst(e)

    def basename(self, e):
        s = e.shown
        if s == "/":
            return "/"
        s = s.rstrip("/") or "/"
        return posixpath.basename(s)

    # ------------------------------------------------------- разбор ---

    def parse(self, tokens):
        self.tokens = tokens
        self.pos = 0
        if not tokens:
            return None
        node = self.p_list()
        if self.pos < len(tokens):
            tok = tokens[self.pos]
            if tok == ")":
                raise FindError("find: непарная «)»")
            raise FindError(f"find: неожиданный аргумент «{tok}»")
        return node

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def take(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def p_list(self):
        left = self.p_or()
        while self.peek() == ",":
            self.take()
            right = self.p_or()
            left = ("comma", left, right)
        return left

    def p_or(self):
        left = self.p_and()
        while self.peek() in ("-o", "-or"):
            self.take()
            right = self.p_and()
            left = ("or", left, right)
        return left

    def p_and(self):
        left = self.p_not()
        while True:
            tok = self.peek()
            if tok in ("-a", "-and"):
                self.take()
                left = ("and", left, self.p_not())
            elif tok is not None and tok not in ("-o", "-or", ")", ","):
                left = ("and", left, self.p_not())
            else:
                return left

    def p_not(self):
        tok = self.peek()
        if tok in ("!", "-not"):
            self.take()
            return ("not", self.p_not())
        if tok == "(":
            self.take()
            if self.peek() == ")":
                raise FindError("find: пустые скобки «()» недопустимы")
            node = self.p_list()
            if self.peek() != ")":
                raise FindError("find: непарная «(»")
            self.take()
            return node
        if tok is None:
            raise FindError("find: ожидалось выражение")
        return self.primary()

    def arg(self, name):
        if self.pos >= len(self.tokens):
            raise FindError(f"find: пропущен аргумент у «{name}»")
        return self.take()

    def primary(self):
        name = self.take()
        if not name.startswith("-") or len(name) < 2:
            raise FindError(f"find: путь должен указываться перед выражением: «{name}»")

        # глобальные параметры — всегда истинны
        if name in GLOBAL_OPTS:
            if self.saw_test and name in ("-maxdepth", "-mindepth", "-depth", "-d"):
                self.io.err(
                    f"find: предупреждение: глобальный параметр {name} указан после аргумента {self.saw_test}, "
                    "но глобальные параметры не позиционные — они действуют всегда. Указывайте их перед остальными аргументами."
                )
            if name == "-maxdepth":
                v = self.arg(name)
                if not v.isdigit():
                    raise FindError(f"find: неверный аргумент «{v}» для «-maxdepth»")
                self.maxdepth = int(v)
            elif name == "-mindepth":
                v = self.arg(name)
                if not v.isdigit():
                    raise FindError(f"find: неверный аргумент «{v}» для «-mindepth»")
                self.mindepth = int(v)
            elif name in ("-depth", "-d"):
                self.depth_first = True
            elif name == "-follow":
                self.follow = True
            elif name == "-daystart":
                self.daystart = True
            elif name == "-regextype":
                v = self.arg(name)
                if v not in ("emacs", "posix-basic", "posix-extended", "posix-egrep", "egrep", "grep", "sed",
                             "ed", "awk", "posix-awk", "gnu-awk", "findutils-default"):
                    raise FindError(f"find: неизвестный тип регулярных выражений «{v}»")
                self.regextype = v
            return ("const", True)

        self.saw_test = self.saw_test or name
        sb = self.sb

        if name in ("-true",):
            return ("const", True)
        if name in ("-false",):
            return ("const", False)
        if name in ("-name", "-iname"):
            pat = self.arg(name)
            if "/" in pat:
                self.io.err(f"find: предупреждение: {name} сравнивает только имя файла без каталогов, "
                            f"а в шаблоне «{pat}» есть «/» — такое условие никогда не выполнится. Используйте -path.")
            icase = name == "-iname"
            return ("test", lambda e: fnmatch.fnmatchcase(self.basename(e).lower() if icase else self.basename(e),
                                                          pat.lower() if icase else pat))
        if name in ("-path", "-wholename", "-ipath", "-iwholename"):
            pat = self.arg(name)
            icase = name.startswith("-i")
            return ("test", lambda e: fnmatch.fnmatchcase(e.shown.lower() if icase else e.shown,
                                                          pat.lower() if icase else pat))
        if name in ("-lname", "-ilname"):
            pat = self.arg(name)
            icase = name == "-ilname"

            def lname(e):
                if not sb.islink(e.vrel):
                    return False
                target = sb.readlink(e.vrel)
                return fnmatch.fnmatchcase(target.lower() if icase else target, pat.lower() if icase else pat)
            return ("test", lname)
        if name in ("-regex", "-iregex"):
            pat = self.arg(name)
            rt = self.regextype
            try:
                if rt in ("posix-extended", "posix-egrep", "egrep", "awk", "posix-awk", "gnu-awk"):
                    rx = posixre.compile_posix(pat, extended=True, ignore_case=name == "-iregex")
                else:
                    rx = posixre.compile_posix(pat, extended=False, ignore_case=name == "-iregex",
                                               emacs=rt in ("emacs", "findutils-default"))
            except posixre.RegexError as ex:
                raise FindError(f"find: {ex}")
            return ("test", lambda e: rx.fullmatch(e.shown) is not None)
        if name in ("-type", "-xtype"):
            spec = self.arg(name)
            kinds = set(spec.split(","))
            if not kinds or not kinds <= set("fdlbcps"):
                raise FindError(f"find: неизвестный аргумент для {name}: {spec}")

            def typetest(e, xt=name == "-xtype"):
                use_stat = self.follow != xt
                mode = (self.stt(e) if use_stat else self.lst(e)).st_mode
                return _type_char(mode) in kinds
            return ("test", typetest)
        if name == "-size":
            spec = self.arg(name)
            m = re.fullmatch(r"([+-]?)(\d+)([bcwkMG]?)", spec)
            if not m:
                raise FindError(f"find: неверный аргумент «{spec}» для «-size»")
            sign, n, unit = m.group(1), int(m.group(2)), m.group(3) or "b"
            size_unit = SIZE_UNITS[unit]
            cmp = _num_cmp(sign + str(n), name)
            return ("test", lambda e: cmp(math.ceil(self.meta(e).st_size / size_unit)))
        if name == "-empty":
            def empty(e):
                mode = self.meta(e).st_mode
                if st.S_ISDIR(mode):
                    try:
                        return not os.listdir(sb.path(e.vrel))
                    except OSError:
                        return False
                return st.S_ISREG(mode) and self.meta(e).st_size == 0
            return ("test", empty)
        if name in ("-mtime", "-atime", "-ctime", "-mmin", "-amin", "-cmin"):
            spec = self.arg(name)
            cmp = _num_cmp(spec, name)
            attr = {"m": "st_mtime", "a": "st_atime", "c": "st_ctime"}[name[1]]
            minutes = name.endswith("min")
            now = self.now
            if self.daystart and not minutes:
                lt = time.localtime(now)
                now = time.mktime((lt.tm_year, lt.tm_mon, lt.tm_mday, 0, 0, 0, 0, 0, -1)) + 86400

            def age(e):
                delta = now - getattr(self.meta(e), attr)
                return cmp(math.floor(delta / (60 if minutes else 86400)))
            return ("test", age)
        if name in ("-newer", "-anewer", "-cnewer"):
            ref = self.arg(name)
            try:
                rv = sb.resolve(self.ctx.cwd, ref)
                ref_time = sb.stat(rv).st_mtime
            except (FsError, OSError):
                raise FindError(f"find: '{ref}': Нет такого файла или каталога")
            attr = {"n": "st_mtime", "a": "st_atime", "c": "st_ctime"}[name[1]]
            return ("test", lambda e: getattr(self.meta(e), attr) > ref_time)
        if name in ("-user", "-group"):
            who = self.arg(name)
            is_user = name == "-user"
            known = sb.known_user(who) if is_user else sb.known_group(who)
            if not known and not who.isdigit():
                raise FindError(f"find: «{who}» — неизвестный {'пользователь' if is_user else 'группа'}")
            num = sb.uid if is_user else sb.gid
            text = sb.owner if is_user else sb.group
            if who.isdigit():
                n = int(who)
                return ("test", lambda e: num(e.vrel) == n)
            return ("test", lambda e: text(e.vrel) == who)
        if name in ("-uid", "-gid"):
            cmp = _num_cmp(self.arg(name), name)
            num = sb.uid if name == "-uid" else sb.gid
            return ("test", lambda e: cmp(num(e.vrel)))
        if name in ("-nouser", "-nogroup"):
            if not sb.per_file_owners:
                return ("const", False)
            if name == "-nouser":
                return ("test", lambda e: not sb.known_user(sb.owner(e.vrel)))
            return ("test", lambda e: not sb.known_group(sb.group(e.vrel)))
        if name == "-perm":
            mode, kind = _parse_perm(self.arg(name))

            def perm(e):
                m = st.S_IMODE(self.meta(e).st_mode)
                if kind == "all":
                    return m & mode == mode
                if kind == "any":
                    return mode == 0 or bool(m & mode)
                return m == mode
            return ("test", perm)
        if name in ("-readable", "-writable", "-executable"):
            bit = {"-readable": 4, "-writable": 2, "-executable": 1}[name]
            return ("test", lambda e: sb.can(e.vrel, bit, self.ctx.priv))
        if name == "-links":
            cmp = _num_cmp(self.arg(name), name)
            return ("test", lambda e: cmp(self.meta(e).st_nlink))
        if name == "-inum":
            cmp = _num_cmp(self.arg(name), name)
            return ("test", lambda e: cmp(self.meta(e).st_ino))
        if name == "-samefile":
            ref = self.arg(name)
            try:
                real = sb.real(sb.resolve(self.ctx.cwd, ref))
            except FsError:
                raise FindError(f"find: '{ref}': Нет такого файла или каталога")
            return ("test", lambda e: sb.real(e.vrel) == real)

        # действия
        if name == "-print":
            self.has_action = True
            return ("test", lambda e: self.emit(e.shown + "\n"))
        if name == "-print0":
            self.has_action = True
            return ("test", lambda e: self.emit(e.shown + "\0"))
        if name == "-printf":
            fmt = self.arg(name)
            self.has_action = True
            return ("test", lambda e: self.emit(self.printf(fmt, e)))
        if name == "-ls":
            self.has_action = True
            return ("test", lambda e: self.emit(self.ls_line(e) + "\n"))
        if name in ("-fprint", "-fprintf", "-fls", "-ok", "-okdir"):
            raise FindError(f"find: {name} в учебном терминале не поддерживается")
        if name in ("-exec", "-execdir"):
            self.has_action = True
            cmd = []
            while True:
                if self.pos >= len(self.tokens):
                    raise FindError(f"find: пропущен аргумент у «{name}»")
                tok = self.take()
                if tok == ";":
                    break
                if tok == "+" and cmd and cmd[-1] == "{}":
                    cmd.pop()
                    if not cmd:
                        raise FindError(f"find: пропущен аргумент у «{name}»")
                    batch = (cmd, name == "-execdir", [])
                    self.batches.append(batch)
                    return ("test", lambda e, b=batch: (b[2].append(e), True)[1])
                cmd.append(tok)
            if not cmd:
                raise FindError(f"find: пропущен аргумент у «{name}»")
            return ("test", lambda e: self.exec_one(cmd, e, name == "-execdir"))
        if name == "-delete":
            self.has_action = True
            self.depth_first = True
            return ("test", self.delete)
        if name == "-prune":
            def prune(e):
                e.pruned = True
                return True
            return ("test", prune)
        if name == "-quit":
            def quit_(e):
                raise Quit()
            return ("test", quit_)
        raise FindError(f"find: неизвестный предикат «{name}»")

    # ------------------------------------------------------ вычисление ---

    def eval(self, node, e):
        kind = node[0]
        if kind == "const":
            return node[1]
        if kind == "test":
            return node[1](e)
        if kind == "not":
            return not self.eval(node[1], e)
        if kind == "and":
            return self.eval(node[1], e) and self.eval(node[2], e)
        if kind == "or":
            return self.eval(node[1], e) or self.eval(node[2], e)
        if kind == "comma":
            self.eval(node[1], e)
            return self.eval(node[2], e)
        raise AssertionError(kind)

    def emit(self, text):
        self.io.out(text)
        return True

    def ls_line(self, e):
        s = self.lst(e)
        owner, group = self.sb.owner(e.vrel), self.sb.group(e.vrel)
        t = s.st_mtime
        date = time.strftime("%b %d  %Y" if abs(time.time() - t) > 182 * 86400 else "%b %d %H:%M", time.localtime(t))
        line = (f"{s.st_ino:>9} {s.st_blocks // 2:>4} {vfs.mode_string(s.st_mode)} {s.st_nlink:>3} "
                f"{owner:<8} {group:<8} {s.st_size:>8} {date} {e.shown}")
        if self.sb.islink(e.vrel):
            line += " -> " + self.sb.readlink(e.vrel)
        return line

    def printf(self, fmt, e):
        out = []
        i = 0
        while i < len(fmt):
            c = fmt[i]
            if c == "\\" and i + 1 < len(fmt):
                out.append({"n": "\n", "t": "\t", "\\": "\\", "0": "\0", "a": "\a", "r": "\r"}.get(fmt[i + 1], "\\" + fmt[i + 1]))
                i += 2
                continue
            if c != "%":
                out.append(c)
                i += 1
                continue
            m = re.match(r"%([-+ #0]*)(\d*)(?:\.(\d+))?([TAC].|[a-zA-Z%@])", fmt[i:])
            if not m:
                out.append(c)
                i += 1
                continue
            flags, width, _prec, d = m.groups()
            i += len(m.group(0))
            val = self.directive(d, e)
            if width:
                val = val.ljust(int(width)) if "-" in flags else val.rjust(int(width))
            out.append(val)
        return "".join(out)

    def directive(self, d, e):
        sb = self.sb
        s = self.lst(e)
        if d == "%":
            return "%"
        if d == "p":
            return e.shown
        if d == "f":
            return self.basename(e)
        if d == "h":
            head = posixpath.dirname(e.shown.rstrip("/"))
            return head if head else "."
        if d == "P":
            start = e.start.rstrip("/")
            rest = e.shown[len(start):].lstrip("/") if e.shown.startswith(start) else e.shown
            return rest
        if d == "H":
            return e.start
        if d == "s":
            return str(s.st_size)
        if d == "k":
            return str(s.st_blocks // 2)
        if d == "b":
            return str(s.st_blocks)
        if d == "m":
            return oct(st.S_IMODE(s.st_mode))[2:]
        if d == "M":
            return vfs.mode_string(s.st_mode)
        if d == "u":
            return sb.owner(e.vrel)
        if d == "g":
            return sb.group(e.vrel)
        if d == "U":
            return str(sb.uid(e.vrel))
        if d == "G":
            return str(sb.gid(e.vrel))
        if d == "d":
            return str(e.depth)
        if d == "y":
            return _type_char(s.st_mode)
        if d == "Y":
            return _type_char(self.stt(e).st_mode)
        if d == "l":
            return sb.readlink(e.vrel) if sb.islink(e.vrel) else ""
        if d == "n":
            return str(s.st_nlink)
        if d == "i":
            return str(s.st_ino)
        if d in ("t", "a", "c"):
            return time.strftime("%a %b %d %H:%M:%S %Y", time.localtime(s.st_mtime))
        if d[0] in "TAC":
            t = s.st_mtime
            k = d[1]
            if k == "@":
                return f"{t:.10f}"
            if k == "+":
                return time.strftime("%Y-%m-%d+%H:%M:%S", time.localtime(t))
            if k == "F":
                return time.strftime("%Y-%m-%d", time.localtime(t))
            if k == "T":
                return time.strftime("%H:%M:%S", time.localtime(t))
            return time.strftime("%" + k, time.localtime(t))
        return "%" + d

    def exec_one(self, cmd, e, execdir):
        if execdir:
            parent = posixpath.dirname(e.vrel)
            argv = [x.replace("{}", "./" + self.basename(e)) for x in cmd]
            saved = self.ctx.session["cwd"]
            self.ctx.session["cwd"] = parent
            try:
                return self.ctx.run_argv(argv, IO("", self.io.out, self.io.err)) == 0
            finally:
                self.ctx.session["cwd"] = saved
        argv = [x.replace("{}", e.shown) for x in cmd]
        return self.ctx.run_argv(argv, IO("", self.io.out, self.io.err)) == 0

    def run_batches(self):
        for cmd, execdir, entries in self.batches:
            if not entries:
                continue
            if execdir:
                by_dir = {}
                for e in entries:
                    by_dir.setdefault(posixpath.dirname(e.vrel), []).append("./" + self.basename(e))
                for parent, names in by_dir.items():
                    saved = self.ctx.session["cwd"]
                    self.ctx.session["cwd"] = parent
                    try:
                        if self.ctx.run_argv(cmd + names, IO("", self.io.out, self.io.err)) != 0:
                            self.status = 1
                    finally:
                        self.ctx.session["cwd"] = saved
            else:
                if self.ctx.run_argv(cmd + [e.shown for e in entries], IO("", self.io.out, self.io.err)) != 0:
                    self.status = 1

    def delete(self, e):
        sb = self.sb
        if e.shown in (".", "..") or e.vrel == "":
            return True
        try:
            if not sb.writable:
                raise FsError(vfs.EROFS)
            parent = posixpath.dirname(e.vrel)
            if not self.ctx.priv and sb.owner(parent) != sb.user:
                raise FsError(vfs.EACCES)
            p = sb.path(e.vrel)
            if os.path.isdir(p) and not os.path.islink(p):
                if os.listdir(p):
                    raise FsError("Каталог не пуст")
                os.rmdir(p)
            else:
                os.unlink(p)
            self.ctx.wrote = True
            return True
        except FsError as ex:
            self.io.err(f"find: невозможно удалить '{e.shown}': {ex}")
            self.status = 1
            return False

    # ------------------------------------------------------------ обход ---

    def walk(self, expr, shown, vrel, depth, start):
        self.visits += 1
        if self.visits > MAX_VISITS:
            raise FindError("find: превышен лимит просмотренных файлов")
        e = Entry(shown, vrel, depth, start)
        visit = depth >= self.mindepth
        if visit and not self.depth_first:
            self.eval(expr, e)
        link = self.sb.islink(vrel)
        follow_here = self.follow or (depth == 0 and self.follow_start)
        is_dir = os.path.isdir(self.sb.path(vrel)) and (not link or follow_here)
        if is_dir and not e.pruned and (self.maxdepth is None or depth < self.maxdepth):
            try:
                names = self.sb.listdir(vrel, self.ctx.priv)
            except FsError as ex:
                self.io.err(f"find: '{shown}': {ex}")
                self.status = 1
                names = []
            for name in names:
                child_shown = shown + name if shown.endswith("/") else shown + "/" + name
                child_vrel = f"{vrel}/{name}" if vrel else name
                self.walk(expr, child_shown, child_vrel, depth + 1, start)
        if visit and self.depth_first:
            self.eval(expr, e)


def cmd_find(ctx, argv, io):
    args = list(argv[1:])
    finder = Finder(ctx, io)
    while args and args[0] in ("-H", "-L", "-P"):
        opt = args.pop(0)
        finder.follow = opt == "-L"
        finder.follow_start = opt == "-H"
    paths = []
    while args and not (args[0].startswith("-") and len(args[0]) > 1) and args[0] not in ("(", "!", ")", ","):
        paths.append(args.pop(0))
    try:
        expr = finder.parse(args)
    except FindError as ex:
        io.err(str(ex))
        return 1
    if expr is None:
        expr = ("test", lambda e: finder.emit(e.shown + "\n"))
    elif not finder.has_action:
        expr = ("and", expr, ("test", lambda e: finder.emit(e.shown + "\n")))
    try:
        for p in paths or ["."]:
            try:
                vrel = ctx.resolve(p)
            except FsError as ex:
                io.err(f"find: '{p}': {ex}")
                finder.status = 1
                continue
            if not ctx.sb.lexists(vrel):
                io.err(f"find: '{p}': Нет такого файла или каталога")
                finder.status = 1
                continue
            finder.walk(expr, p, vrel, 0, p)
    except Quit:
        pass
    except FindError as ex:
        io.err(str(ex))
        return 1
    finder.run_batches()
    return finder.status
