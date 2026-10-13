r"""
sed для эмулятора терминала — интерпретатор скриптов GNU sed.

  sed [КЛЮЧИ] СКРИПТ [ФАЙЛ...]
  sed [КЛЮЧИ] -e СКРИПТ [-e СКРИПТ...] [-f ФАЙЛ] [ФАЙЛ...]

Ключи: -n/--quiet/--silent, -e/--expression, -f/--file, -i[СУФФИКС]/--in-place[=СУФФИКС],
       -E/-r/--regexp-extended, -s/--separate, --follow-symlinks, -z/--null-data, -u, --posix
Адреса: N, $, /рег/ (и \%рег%), с флагами I и M, first~step, адр1,адр2, адр,+N, адр,~N,
        0,/рег/, адр! (отрицание)
Команды: s y p P d D n N g G h H x = l q Q a i c r R w W z F e(нет) v : b t T { } #
Флаги s: g, N (номер вхождения), p, i/I, m/M, w файл, e (нет)
Замена: & \1..\9 \n \t \L \U \l \u \E

Правка файлов (-i) идёт через Sandbox.write_text с правами текущей команды (sudo),
символическая ссылка без --follow-symlinks заменяется обычным файлом — как в GNU sed.
"""

import re

import posixre
from vfs import FsError

MAX_STEPS = 2_000_000


class SedError(Exception):
    pass


# ================================================================ разбор ===

class Script:
    def __init__(self, text, extended):
        self.text = text
        self.extended = extended
        self.pos = 0
        self.cmds = []
        self.labels = {}
        self.quiet_hint = text.startswith("#n\n") or text == "#n"

    def error(self, msg):
        raise SedError(f"sed: -e выражение #1, символ {self.pos}: {msg}")

    def peek(self):
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def getc(self):
        c = self.peek()
        self.pos += 1
        return c

    def skip_ws(self, newlines=False):
        while self.peek() and (self.peek() in " \t" or (newlines and self.peek() in "\n;")):
            self.pos += 1

    def read_until_delim(self, delim, regex):
        """Читает до неэкранированного разделителя. \\разделитель -> разделитель."""
        out = []
        while True:
            c = self.getc()
            if c == "":
                return None
            if c == "\\":
                d = self.getc()
                if d == "":
                    return None
                if d == delim and delim != "&":
                    out.append(delim if regex or delim not in "\\" else "\\" + d)
                elif d == "\n":
                    out.append("\n" if not regex else "\\n")
                else:
                    out.append("\\" + d)
                continue
            if c == delim:
                return "".join(out)
            if c == "\n" and regex:
                return None
            out.append(c)

    def compile_regex(self, src, flags_i=False, flags_m=False):
        if src == "":
            return "LAST"
        try:
            return posixre.compile_posix(src, extended=self.extended, ignore_case=flags_i, multiline=flags_m)
        except posixre.RegexError as e:
            self.error(str(e))

    def parse_address(self):
        c = self.peek()
        if c.isdigit():
            m = re.match(r"\d+", self.text[self.pos:])
            n = int(m.group(0))
            self.pos += len(m.group(0))
            if self.peek() == "~":
                self.pos += 1
                m2 = re.match(r"\d+", self.text[self.pos:])
                step = int(m2.group(0)) if m2 else 0
                self.pos += len(m2.group(0)) if m2 else 0
                return ("step", n, step)
            return ("line", n)
        if c == "$":
            self.pos += 1
            return ("last",)
        if c == "/" or c == "\\":
            if c == "\\":
                self.pos += 1
                delim = self.getc()
            else:
                delim = self.getc()
            src = self.read_until_delim(delim, True)
            if src is None:
                self.error("незавершённое регулярное выражение адреса")
            fi = fm = False
            while self.peek() in ("I", "M"):
                if self.getc() == "I":
                    fi = True
                else:
                    fm = True
            return ("re", self.compile_regex(src, fi, fm))
        return None

    def parse_addr2(self):
        c = self.peek()
        if c == "+":
            self.pos += 1
            m = re.match(r"\d+", self.text[self.pos:])
            if not m:
                self.error("ожидался номер строки после «+»")
            self.pos += len(m.group(0))
            return ("rel", int(m.group(0)))
        if c == "~":
            self.pos += 1
            m = re.match(r"\d+", self.text[self.pos:])
            if not m:
                self.error("ожидалось число после «~»")
            self.pos += len(m.group(0))
            return ("mult", int(m.group(0)))
        a = self.parse_address()
        if a is None:
            self.error("ожидался адрес после «,»")
        if a[0] == "step":
            return ("line", a[1])
        return a

    def read_label(self):
        self.skip_ws()
        start = self.pos
        while self.peek() and self.peek() not in ";\n":
            self.pos += 1
        return self.text[start:self.pos].strip()

    def read_filename(self):
        self.skip_ws()
        start = self.pos
        while self.peek() and self.peek() != "\n":
            self.pos += 1
        return self.text[start:self.pos]

    def read_text_arg(self):
        """Текст для a/i/c: GNU-однострочник «a текст» или классика «a\\<перевод строки>текст»."""
        self.skip_ws()
        if self.peek() == "\\":
            self.pos += 1
            if self.peek() == "\n":
                self.pos += 1
            else:
                self.skip_ws()
        out = []
        while True:
            c = self.getc()
            if c == "" or c == "\n":
                break
            if c == "\\":
                d = self.getc()
                if d == "\n":
                    out.append("\n")
                    continue
                if d == "":
                    break
                out.append({"t": "\t", "n": "\n"}.get(d, d))
                continue
            out.append(c)
        return "".join(out)

    def end_of_cmd(self):
        self.skip_ws()
        c = self.peek()
        if c in ("", "\n", ";"):
            if c:
                self.pos += 1
            return
        if c == "}" or c == "#":
            return
        self.error(f"лишние символы после команды")

    def parse(self):
        stack = []
        while True:
            self.skip_ws(newlines=True)
            if self.pos >= len(self.text):
                break
            if self.peek() == "#":
                while self.peek() and self.peek() != "\n":
                    self.pos += 1
                continue
            cmd = {"a1": None, "a2": None, "neg": False, "active": False, "end": None}
            a1 = self.parse_address()
            if a1 is not None:
                cmd["a1"] = a1
                if self.peek() == ",":
                    self.pos += 1
                    self.skip_ws()
                    cmd["a2"] = self.parse_addr2()
                elif a1 == ("line", 0):
                    self.error("неверный номер строки 0")
            if cmd["a1"] == ("line", 0) and not (cmd["a2"] and cmd["a2"][0] == "re"):
                self.error("неверный номер строки 0")
            self.skip_ws()
            while self.peek() == "!":
                cmd["neg"] = True
                self.pos += 1
                self.skip_ws()
            name = self.getc()
            if name == "":
                self.error("отсутствует команда")
            cmd["name"] = name
            if name == "{":
                stack.append(len(self.cmds))
                self.cmds.append(cmd)
                continue
            if name == "}":
                if cmd["a1"] is not None:
                    self.error("у «}» не может быть адреса")
                if not stack:
                    self.error("неожиданная «}»")
                open_idx = stack.pop()
                self.cmds[open_idx]["jump"] = len(self.cmds) + 1
                self.cmds.append(cmd)
                self.end_of_cmd()
                continue
            if name in "=dDgGhHlnNpPxzF":
                if name == "l":
                    self.skip_ws()
                    m = re.match(r"\d+", self.text[self.pos:])
                    if m:
                        self.pos += len(m.group(0))
                self.cmds.append(cmd)
                self.end_of_cmd()
                continue
            if name in "qQ":
                self.skip_ws()
                m = re.match(r"\d+", self.text[self.pos:])
                cmd["code"] = int(m.group(0)) if m else 0
                if m:
                    self.pos += len(m.group(0))
                self.cmds.append(cmd)
                self.end_of_cmd()
                continue
            if name in "aic":
                cmd["text"] = self.read_text_arg()
                self.cmds.append(cmd)
                continue
            if name in "rRwW":
                cmd["file"] = self.read_filename()
                if not cmd["file"]:
                    self.error(f"для «{name}» нужно имя файла")
                self.cmds.append(cmd)
                continue
            if name in "btT":
                cmd["label"] = self.read_label()
                if self.peek() == ";":
                    self.pos += 1
                self.cmds.append(cmd)
                continue
            if name == ":":
                if cmd["a1"] is not None:
                    self.error("у «:» не может быть адреса")
                label = self.read_label()
                if not label:
                    self.error("для «:» нужна метка")
                if self.peek() == ";":
                    self.pos += 1
                self.labels[label] = len(self.cmds)
                continue
            if name == "s":
                self.parse_s(cmd)
                self.cmds.append(cmd)
                continue
            if name == "y":
                delim = self.getc()
                src = self.read_until_delim(delim, False)
                dst = self.read_until_delim(delim, False) if src is not None else None
                if src is None or dst is None:
                    self.error("незавершённая команда «y»")
                src = self._unescape_y(src)
                dst = self._unescape_y(dst)
                if len(src) != len(dst):
                    self.error("строки для команды «y» имеют разную длину")
                cmd["table"] = str.maketrans(src, dst)
                self.cmds.append(cmd)
                self.end_of_cmd()
                continue
            if name == "e":
                self.error("команда «e» (выполнение во внешней оболочке) в учебном терминале запрещена")
            if name == "v":
                self.read_label()
                continue
            self.error(f"неизвестная команда: «{name}»")
        if stack:
            self.pos = len(self.text)
            self.error("непарная «{»")
        for c in self.cmds:
            if c["name"] in "btT" and c["label"] and c["label"] not in self.labels:
                raise SedError(f"sed: не удаётся найти метку для перехода к «{c['label']}»")
        return self

    @staticmethod
    def _unescape_y(s):
        return re.sub(r"\\(.)", lambda m: {"n": "\n", "t": "\t", "\\": "\\"}.get(m.group(1), m.group(1)), s)

    def parse_s(self, cmd):
        delim = self.getc()
        if delim in ("", "\n", "\\"):
            self.error("незавершённая команда «s»")
        regex = self.read_until_delim(delim, True)
        if regex is None:
            self.error("незавершённая команда «s»")
        repl = self.read_until_delim(delim, False)
        if repl is None:
            self.error("незавершённая команда «s»")
        cmd["global"] = False
        cmd["nth"] = 1
        cmd["print"] = 0
        cmd["wfile"] = None
        fi = fm = False
        while True:
            c = self.peek()
            if c == "":
                break
            if c == "g":
                cmd["global"] = True
            elif c == "p":
                cmd["print"] += 1
            elif c in "iI":
                fi = True
            elif c in "mM":
                fm = True
            elif c.isdigit():
                m = re.match(r"\d+", self.text[self.pos:])
                cmd["nth"] = int(m.group(0))
                if cmd["nth"] == 0:
                    self.error("номер вхождения в «s» не может быть нулём")
                self.pos += len(m.group(0)) - 1
            elif c == "e":
                self.error("флаг «e» команды «s» в учебном терминале запрещён")
            elif c == "w":
                self.pos += 1
                cmd["wfile"] = self.read_filename()
                break
            else:
                break
            self.pos += 1
        cmd["regex"] = self.compile_regex(regex, fi, fm)
        cmd["repl"] = parse_replacement(repl)
        if cmd["wfile"] is None:
            self.end_of_cmd()


def parse_replacement(s):
    """-> список частей: ('lit', текст) / ('grp', n) / ('case', U|L|E|u|l)."""
    parts = []
    i = 0
    buf = ""
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            d = s[i + 1]
            i += 2
            if d.isdigit():
                if buf:
                    parts.append(("lit", buf))
                    buf = ""
                parts.append(("grp", int(d)))
            elif d in "LUElu":
                if buf:
                    parts.append(("lit", buf))
                    buf = ""
                parts.append(("case", d))
            elif d == "n":
                buf += "\n"
            elif d == "t":
                buf += "\t"
            elif d == "&":
                buf += "&"
            else:
                buf += d
            continue
        if c == "&":
            if buf:
                parts.append(("lit", buf))
                buf = ""
            parts.append(("grp", 0))
            i += 1
            continue
        buf += c
        i += 1
    if buf:
        parts.append(("lit", buf))
    return parts


def expand_replacement(parts, m):
    out = []
    mode = None       # 'U' / 'L'
    once = None       # 'u' / 'l'
    for kind, val in parts:
        if kind == "case":
            if val in "UL":
                mode = val
            elif val == "E":
                mode = None
            else:
                once = val
            continue
        if kind == "grp":
            try:
                text = m.group(val) or ""
            except IndexError:
                raise SedError(f"sed: ссылка \\{val} на несуществующую группу в правой части «s»")
        else:
            text = val
        if mode == "U":
            text = text.upper()
        elif mode == "L":
            text = text.lower()
        if once and text:
            text = (text[0].upper() if once == "u" else text[0].lower()) + text[1:]
            once = None
        out.append(text)
    return "".join(out)


# ============================================================ выполнение ===

class Input:
    """Поток строк по нескольким входам; separate=True — каждый файл отдельно ($ = конец файла)."""

    def __init__(self, sources, separate):
        self.sources = sources        # [(имя, текст)]
        self.separate = separate
        self.file_idx = 0
        self.lines = []
        self.idx = 0
        self.last_nl = True
        self._load()

    def _load(self):
        while self.file_idx < len(self.sources):
            name, text = self.sources[self.file_idx]
            lines = text.split("\n")
            self.last_nl = text.endswith("\n")
            if self.last_nl:
                lines = lines[:-1]
            if lines or not self.separate:
                self.lines = lines
                self.idx = 0
                self.name = name
                if lines:
                    return
            self.file_idx += 1
        self.lines = []
        self.idx = 0

    def has_next(self):
        if self.idx >= len(self.lines) and self.separate and self.file_idx < len(self.sources):
            self.file_idx += 1
            self._load()
        return self.idx < len(self.lines)

    def next(self):
        line = self.lines[self.idx]
        self.idx += 1
        has_nl = self.idx < len(self.lines) or self.last_nl
        if self.idx >= len(self.lines) and not self.separate:
            self.file_idx += 1
            self._load()
        return line, has_nl

    def is_last(self):
        if self.idx < len(self.lines):
            return False
        return True


class Sed:
    def __init__(self, ctx, io, script, quiet, follow_symlinks, null_data):
        self.ctx = ctx
        self.io = io
        self.cmds = script.cmds
        self.labels = script.labels
        self.quiet = quiet or script.quiet_hint
        self.follow_symlinks = follow_symlinks
        self.sep = "\0" if null_data else "\n"
        self.last_regex = None
        self.wfiles = {}
        self.steps = 0
        self.exit_code = None
        self.lineno = 0

    def regex(self, r):
        if r == "LAST":
            if self.last_regex is None:
                raise SedError("sed: нет предыдущего регулярного выражения")
            return self.last_regex
        self.last_regex = r
        return r

    def match_addr(self, a, ps, inp):
        kind = a[0]
        if kind == "line":
            return self.lineno == a[1]
        if kind == "last":
            return inp.is_last()
        if kind == "re":
            return self.regex(a[1]).search(ps) is not None
        if kind == "step":
            first, step = a[1], a[2]
            if step <= 0:
                return self.lineno == first
            return self.lineno >= first and (self.lineno - first) % step == 0
        return False

    def selected(self, cmd, ps, inp):
        a1, a2 = cmd["a1"], cmd["a2"]
        if a1 is None:
            hit = True
        elif a2 is None:
            hit = self.match_addr(a1, ps, inp)
        elif cmd["active"]:
            kind = a2[0]
            if kind == "line":
                end = self.lineno >= a2[1]
            elif kind == "rel":
                end = self.lineno >= cmd["end"]
            elif kind == "mult":
                end = a2[1] <= 0 or self.lineno % a2[1] == 0
            elif kind == "last":
                end = inp.is_last()
            else:
                end = self.regex(a2[1]).search(ps) is not None
            if end:
                cmd["active"] = False
            hit = True
        else:
            if a1 == ("line", 0):
                start = self.lineno == 1 and not cmd.get("zero_used")
                if start:
                    cmd["zero_used"] = True
                    if self.regex(a2[1]).search(ps):
                        return not cmd["neg"]
                    cmd["active"] = True
                    return not cmd["neg"]
                hit = False
            elif self.match_addr(a1, ps, inp):
                hit = True
                kind = a2[0]
                if kind == "line":
                    cmd["active"] = a2[1] > self.lineno
                elif kind == "rel":
                    cmd["end"] = self.lineno + a2[1]
                    cmd["active"] = a2[1] > 0
                elif kind == "mult":
                    cmd["active"] = not (a2[1] <= 0 or self.lineno % a2[1] == 0)
                elif kind == "last":
                    cmd["active"] = not inp.is_last()
                else:
                    cmd["active"] = True
            else:
                hit = False
        return hit != cmd["neg"]

    def write_to(self, name, text):
        if name in ("/dev/stdout",):
            self.out(text)
            return
        if name == "/dev/stderr":
            self.io.err(text.rstrip("\n"))
            return
        self.wfiles.setdefault(name, []).append(text)

    def substitute(self, cmd, ps):
        rx = self.regex(cmd["regex"])
        nth = cmd["nth"]
        count = 0
        out = []
        pos = 0
        done = False
        for m in rx.finditer(ps):
            count += 1
            if count < nth:
                continue
            out.append(ps[pos:m.start()])
            out.append(expand_replacement(cmd["repl"], m))
            pos = m.end()
            done = True
            if not cmd["global"]:
                break
        if not done:
            return ps, False
        out.append(ps[pos:])
        return "".join(out), True

    def run(self, inp, out):
        """out(text) — куда печатать. Возвращает True, если нужно остановить обработку (q/Q)."""
        self.out = out
        hold = ""
        cmds = self.cmds
        while inp.has_next():
            ps, nl = inp.next()
            self.lineno += 1
            tflag = False
            append_queue = []
            restart = True
            while restart:
                restart = False
                pc = 0
                delete = False
                skip_autoprint = False
                while pc < len(cmds):
                    self.steps += 1
                    if self.steps > MAX_STEPS:
                        raise SedError("sed: превышен лимит выполнения скрипта (возможно, бесконечный цикл)")
                    cmd = cmds[pc]
                    name = cmd["name"]
                    if name == "}":
                        pc += 1
                        continue
                    if not self.selected(cmd, ps, inp):
                        pc = cmd["jump"] if name == "{" else pc + 1
                        continue
                    pc += 1
                    if name == "{":
                        continue
                    if name == "s":
                        ps, did = self.substitute(cmd, ps)
                        if did:
                            tflag = True
                            for _ in range(cmd["print"]):
                                out(ps + self.sep)
                            if cmd["wfile"]:
                                self.write_to(cmd["wfile"], ps + "\n")
                    elif name == "p":
                        out(ps + self.sep)
                    elif name == "P":
                        out(ps.split("\n", 1)[0] + self.sep)
                    elif name == "d":
                        delete = True
                        break
                    elif name == "D":
                        if "\n" not in ps:
                            delete = True
                            break
                        ps = ps.split("\n", 1)[1]
                        for t in append_queue:
                            out(t)
                        append_queue = []
                        restart = True
                        break
                    elif name == "=":
                        out(f"{self.lineno}\n")
                    elif name == "a":
                        append_queue.append(cmd["text"] + "\n")
                    elif name == "i":
                        out(cmd["text"] + "\n")
                    elif name == "c":
                        if cmd["a2"] is None or not cmd["active"] or cmd["neg"]:
                            out(cmd["text"] + "\n")
                        delete = True
                        break
                    elif name == "r":
                        try:
                            text, _ = self.ctx.sb.read_text(self.ctx.resolve(cmd["file"]), self.ctx.priv)
                            append_queue.append(text if text.endswith("\n") or not text else text + "\n")
                        except FsError:
                            pass
                    elif name == "R":
                        rlines = self.wfiles.setdefault(("R", cmd["file"]), None)
                        if rlines is None:
                            try:
                                text, _ = self.ctx.sb.read_text(self.ctx.resolve(cmd["file"]), self.ctx.priv)
                                rlines = text.split("\n")
                                if text.endswith("\n"):
                                    rlines = rlines[:-1]
                            except FsError:
                                rlines = []
                            self.wfiles[("R", cmd["file"])] = rlines
                        if rlines:
                            append_queue.append(rlines.pop(0) + "\n")
                    elif name == "w":
                        self.write_to(cmd["file"], ps + "\n")
                    elif name == "W":
                        self.write_to(cmd["file"], ps.split("\n", 1)[0] + "\n")
                    elif name == "h":
                        hold = ps
                    elif name == "H":
                        hold = hold + "\n" + ps
                    elif name == "g":
                        ps = hold
                    elif name == "G":
                        ps = ps + "\n" + hold
                    elif name == "x":
                        ps, hold = hold, ps
                    elif name == "z":
                        ps = ""
                    elif name == "y":
                        ps = ps.translate(cmd["table"])
                    elif name == "l":
                        out(self.escape_l(ps) + "\n")
                    elif name == "F":
                        out(getattr(inp, "name", "-") + "\n")
                    elif name == "n":
                        if not self.quiet:
                            out(ps + ("\n" if nl else ""))
                        if not inp.has_next():
                            skip_autoprint = True
                            for t in append_queue:
                                out(t)
                            return True
                        for t in append_queue:
                            out(t)
                        append_queue = []
                        ps, nl = inp.next()
                        self.lineno += 1
                    elif name == "N":
                        if not inp.has_next():
                            break
                        for t in append_queue:
                            out(t)
                        append_queue = []
                        nxt, nl = inp.next()
                        self.lineno += 1
                        ps = ps + "\n" + nxt
                    elif name in "qQ":
                        if name == "q" and not self.quiet:
                            out(ps + ("\n" if nl else ""))
                        for t in append_queue:
                            out(t)
                        self.exit_code = cmd["code"]
                        return True
                    elif name in "btT":
                        if name == "b":
                            jump = True
                        elif name == "t":
                            jump = tflag
                            tflag = False
                        else:
                            jump = not tflag
                            tflag = False
                        if jump:
                            pc = self.labels.get(cmd["label"], len(cmds)) if cmd["label"] else len(cmds)
                if restart:
                    continue
                if not delete and not self.quiet and not skip_autoprint:
                    out(ps + ("\n" if nl else ""))
                for t in append_queue:
                    out(t)
        return False

    @staticmethod
    def escape_l(s):
        out = []
        for ch in s:
            code = ord(ch)
            if ch == "\\":
                out.append("\\\\")
            elif ch == "\n":
                out.append("\\n")
            elif ch == "\t":
                out.append("\\t")
            elif code < 32 or code == 127:
                out.append("\\%03o" % code)
            else:
                out.append(ch)
        return "".join(out) + "$"


# ================================================================ команда ===

def parse_args(argv):
    scripts = []
    opts = {"quiet": False, "inplace": None, "extended": False, "separate": False,
            "follow": False, "null": False}
    operands = []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--":
            operands.extend(argv[i + 1:])
            break
        if a.startswith("--"):
            name, eq, val = a.partition("=")
            if name in ("--quiet", "--silent"):
                opts["quiet"] = True
            elif name == "--expression":
                if not eq:
                    i += 1
                    val = argv[i] if i < len(argv) else None
                if val is None:
                    raise SedError("sed: ключ «--expression» требует аргумент")
                scripts.append(("e", val))
            elif name == "--file":
                if not eq:
                    i += 1
                    val = argv[i] if i < len(argv) else None
                if val is None:
                    raise SedError("sed: ключ «--file» требует аргумент")
                scripts.append(("f", val))
            elif name == "--in-place":
                opts["inplace"] = val if eq else ""
            elif name == "--regexp-extended":
                opts["extended"] = True
            elif name == "--separate":
                opts["separate"] = True
            elif name == "--follow-symlinks":
                opts["follow"] = True
            elif name == "--null-data":
                opts["null"] = True
            elif name in ("--posix", "--unbuffered", "--sandbox", "--debug"):
                pass
            elif name == "--help":
                raise SedError("Использование: sed [КЛЮЧ]… {скрипт} [ФАЙЛ]…\nЗапустите «man sed» для получения справки.")
            else:
                raise SedError(f"sed: нераспознанный ключ «{a}»")
            i += 1
            continue
        if a.startswith("-") and len(a) > 1:
            j = 1
            while j < len(a):
                ch = a[j]
                if ch == "n":
                    opts["quiet"] = True
                elif ch in "Er":
                    opts["extended"] = True
                elif ch == "s":
                    opts["separate"] = True
                elif ch == "z":
                    opts["null"] = True
                elif ch == "u":
                    pass
                elif ch == "i":
                    opts["inplace"] = a[j + 1:]
                    break
                elif ch in "ef":
                    val = a[j + 1:]
                    if not val:
                        i += 1
                        if i >= len(argv):
                            raise SedError(f"sed: ключ требует аргумент -- «{ch}»")
                        val = argv[i]
                    scripts.append((ch, val))
                    break
                else:
                    raise SedError(f"sed: неверный ключ — «{ch}»\nИспользование: sed [КЛЮЧ]… {{скрипт}} [ФАЙЛ]…")
                j += 1
            i += 1
            continue
        operands.append(a)
        i += 1
    return scripts, opts, operands


def cmd_sed(ctx, argv, io):
    try:
        scripts, opts, operands = parse_args(argv)
        if not scripts:
            if not operands:
                raise SedError("Использование: sed [КЛЮЧ]… {скрипт} [ФАЙЛ]…\nЗапустите «man sed» для получения справки.")
            scripts.append(("e", operands.pop(0)))
        texts = []
        for kind, val in scripts:
            if kind == "f":
                t = ctx.read_input("sed", val, io)
                if t is None:
                    return 1
                texts.append(t.rstrip("\n"))
            else:
                texts.append(val)
        script = Script("\n".join(texts), opts["extended"]).parse()
    except SedError as e:
        io.err(str(e))
        return 1

    def make():
        return Sed(ctx, io, script, opts["quiet"], opts["follow"], opts["null"])

    status = 0
    inplace = opts["inplace"]
    try:
        if inplace is not None:
            if not operands:
                io.err("sed: не указаны входные файлы")
                return 1
            for name in operands:
                for c in script.cmds:
                    c["active"] = False
                    c.pop("zero_used", None)
                try:
                    vrel = ctx.resolve(name)
                    if not ctx.sb.lexists(vrel) or not ctx.sb.exists(vrel):
                        raise FsError("Нет такого файла или каталога")
                    if ctx.sb.isdir(vrel):
                        io.err(f"sed: не удаётся изменить {name}: Это каталог")
                        status = 4
                        continue
                    ctx.sb.check_write(vrel, ctx.priv)
                    text, _ = ctx.sb.read_text(vrel, ctx.priv)
                except FsError as e:
                    io.err(f"sed: не удаётся прочитать {name}: {e}" if "Нет такого" in str(e)
                           else f"sed: не удаётся изменить {name}: {e}")
                    status = 4 if "Нет такого" not in str(e) else 2
                    continue
                buf = []
                sed = make()
                stop = sed.run(Input([(name, text)], True), buf.append)
                result = "".join(buf)
                try:
                    if inplace:
                        base = name.rsplit("/", 1)
                        if "*" in inplace:
                            bname = inplace.replace("*", base[-1])
                            backup = bname if "/" in bname else (base[0] + "/" + bname if len(base) == 2 else bname)
                        else:
                            backup = name + inplace
                        ctx.sb.write_text(ctx.resolve(backup), text, ctx.priv)
                    ctx.sb.write_text(vrel, result, ctx.priv, follow_symlinks=opts["follow"])
                    ctx.wrote = True
                except FsError as e:
                    io.err(f"sed: не удаётся записать {name}: {e}")
                    status = 4
                flush_wfiles(ctx, sed, io)
                if sed.exit_code is not None:
                    return sed.exit_code
                if stop:
                    break
            return status

        sources = []
        for name in operands or ["-"]:
            if name == "-":
                sources.append(("-", io.stdin or ""))
                continue
            try:
                vrel = ctx.resolve(name)
                if ctx.sb.isdir(vrel):
                    io.err(f"sed: ошибка чтения {name}: Это каталог")
                    status = 2
                    continue
                text, _ = ctx.sb.read_text(vrel, ctx.priv)
            except FsError as e:
                io.err(f"sed: не удаётся прочитать {name}: {e}")
                status = 2
                continue
            sources.append((name, text))
        sed = make()
        sed.run(Input(sources, opts["separate"]), io.out)
        flush_wfiles(ctx, sed, io)
        if sed.exit_code is not None:
            return sed.exit_code
        return status
    except SedError as e:
        io.err(str(e))
        return 4


def flush_wfiles(ctx, sed, io):
    for name, chunks in sed.wfiles.items():
        if isinstance(name, tuple):
            continue
        try:
            ctx.sb.write_text(ctx.resolve(name), "".join(chunks), ctx.priv)
            ctx.wrote = True
        except FsError as e:
            io.err(f"sed: не удаётся записать {name}: {e}")
