"""
grep для эмулятора терминала — поведение как у GNU grep.

  grep [КЛЮЧИ] ШАБЛОНЫ [ФАЙЛ...]
  grep [КЛЮЧИ] -e ШАБЛОН ... [ФАЙЛ...]
  grep [КЛЮЧИ] -f ФАЙЛ ... [ФАЙЛ...]

Шаблоны: -G (BRE, по умолчанию) -E (ERE) -F (строки) -P (Perl/Python), -e, -f,
         -i/-y, --no-ignore-case, -w, -x
Вывод:   -v -c -l -L -n -b -h -H -o -q/--quiet/--silent -s -m N -Z/--null --label
         --color (игнорируется), -T
Контекст: -A N -B N -C N -NUM, --group-separator / --no-group-separator
Файлы:   -r -R --include=ШАБЛОН --exclude=ШАБЛОН --exclude-dir=ШАБЛОН -a -I --binary-files
"""

import fnmatch
import os
import re

import posixre
from vfs import FsError

NO_ARG_SHORT = set("iyvwxclLnhHsqrREFGPoaIZbTUz")
ARG_SHORT = set("efmABCdD")

LONG = {
    "--ignore-case": ("i", False), "--no-ignore-case": ("no-i", False), "--invert-match": ("v", False),
    "--word-regexp": ("w", False), "--line-regexp": ("x", False), "--count": ("c", False),
    "--files-with-matches": ("l", False), "--files-without-match": ("L", False),
    "--line-number": ("n", False), "--with-filename": ("H", False), "--no-filename": ("h", False),
    "--only-matching": ("o", False), "--quiet": ("q", False), "--silent": ("q", False),
    "--no-messages": ("s", False), "--recursive": ("r", False), "--dereference-recursive": ("R", False),
    "--extended-regexp": ("E", False), "--fixed-strings": ("F", False), "--basic-regexp": ("G", False),
    "--perl-regexp": ("P", False), "--text": ("a", False), "--null": ("Z", False),
    "--byte-offset": ("b", False), "--initial-tab": ("T", False), "--no-group-separator": ("no-sep", False),
    "--regexp": ("e", True), "--file": ("f", True), "--max-count": ("m", True),
    "--after-context": ("A", True), "--before-context": ("B", True), "--context": ("C", True),
    "--include": ("include", True), "--exclude": ("exclude", True), "--exclude-dir": ("exclude-dir", True),
    "--label": ("label", True), "--binary-files": ("binary-files", True), "--group-separator": ("sep", True),
    "--color": ("color", None), "--colour": ("color", None), "--devices": ("D", True),
    "--directories": ("d", True),
}


class Usage(Exception):
    pass


def parse_args(argv, mode=None):
    opts = {"e": [], "f": [], "include": [], "exclude": [], "exclude-dir": []}
    if mode:
        opts[mode] = True
    operands = []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--":
            operands.extend(argv[i + 1:])
            break
        if a.startswith("--"):
            name, eq, val = a.partition("=")
            matches = [k for k in LONG if k == name] or [k for k in LONG if k.startswith(name)]
            if len(matches) != 1:
                raise Usage(f"grep: нераспознанный ключ «{a}»" if not matches else f"grep: ключ «{a}» неоднозначен")
            key, takes = LONG[matches[0]]
            if takes is True:
                if not eq:
                    i += 1
                    if i >= len(argv):
                        raise Usage(f"grep: ключ «{matches[0]}» требует аргумент")
                    val = argv[i]
                _store(opts, key, val)
            elif takes is None:
                pass
            else:
                if eq:
                    raise Usage(f"grep: ключ «{matches[0]}» не допускает аргумент")
                _store(opts, key, True)
            i += 1
            continue
        if a.startswith("-") and len(a) > 1:
            if re.fullmatch(r"-\d+", a):
                opts["C"] = a[1:]
                i += 1
                continue
            j = 1
            while j < len(a):
                ch = a[j]
                if ch in ARG_SHORT:
                    val = a[j + 1:]
                    if not val:
                        i += 1
                        if i >= len(argv):
                            raise Usage(f"grep: ключ требует аргумент -- «{ch}»")
                        val = argv[i]
                    _store(opts, ch, val)
                    break
                if ch.isdigit():
                    opts["C"] = a[j:]
                    break
                if ch not in NO_ARG_SHORT:
                    raise Usage(f"grep: неверный ключ — «{ch}»\nИспользование: grep [КЛЮЧ]… ШАБЛОНЫ [ФАЙЛ]…")
                _store(opts, ch, True)
                j += 1
            i += 1
            continue
        operands.append(a)
        i += 1
    return opts, operands


def _store(opts, key, val):
    if key in ("e", "f", "include", "exclude", "exclude-dir"):
        opts[key].append(val)
    elif key == "y":
        opts["i"] = True
    elif key == "no-i":
        opts.pop("i", None)
    elif key in ("E", "F", "G", "P"):
        for k in ("E", "F", "G", "P"):
            opts.pop(k, None)
        opts[key] = True
    else:
        opts[key] = val


def _int(opts, key, default=None):
    if key not in opts:
        return default
    try:
        v = int(opts[key])
        if v < 0:
            raise ValueError
        return v
    except ValueError:
        raise Usage(f"grep: {opts[key]}: неверный аргумент длины контекста" if key in "ABC"
                    else f"grep: неверный максимальный счётчик")


def build_matcher(patterns, opts):
    pieces = []
    for p in patterns:
        if "F" in opts:
            src = re.escape(p)
        elif "P" in opts:
            src = p
        else:
            try:
                src = posixre.to_python(p, extended="E" in opts)
            except posixre.RegexError as e:
                raise Usage(f"grep: {e}")
        if "w" in opts:
            src = r"(?<!\w)(?:" + src + r")(?!\w)"
        if "x" in opts:
            src = r"\A(?:" + src + r")\Z"
        pieces.append("(?:" + src + ")")
    if not pieces:
        return None
    try:
        return re.compile("|".join(pieces), re.IGNORECASE if "i" in opts else 0)
    except re.error as e:
        raise Usage(f"grep: некорректное регулярное выражение: {e}")


class Grep:
    def __init__(self, ctx, io, opts, rx):
        self.ctx = ctx
        self.io = io
        self.opts = opts
        self.rx = rx
        self.after = _int(opts, "A", _int(opts, "C", 0))
        self.before = _int(opts, "B", _int(opts, "C", 0))
        self.max_count = _int(opts, "m")
        self.any_selected = False
        self.error = False
        self.quit = False
        self.with_name = False
        self.auto_name = False
        self.sep_printed = False
        self.group_sep = None if "no-sep" in opts else opts.get("sep", "--")

    def err(self, text):
        self.error = True
        if "s" not in self.opts:
            self.io.err(text)

    def selected(self, line):
        hit = self.rx.search(line) is not None if self.rx else False
        return hit != ("v" in self.opts)

    def prefix(self, name, num, offset, sep):
        out = ""
        if self.with_name:
            out += name + ("\0" if "Z" in self.opts else sep)
        if "n" in self.opts:
            out += f"{num}{sep}"
        if "b" in self.opts:
            out += f"{offset}{sep}"
        if "T" in self.opts and out:
            out += "\t"
        return out

    def grep_text(self, name, text, binary):
        opts = self.opts
        lines = text.split("\n")
        if text.endswith("\n"):
            lines = lines[:-1]
        count = 0
        out = []
        last_printed = -1
        pending_after = 0
        offsets = []
        pos = 0
        for line in lines:
            offsets.append(pos)
            pos += len(line.encode("utf-8")) + 1
        quiet_kinds = "q" in opts or "l" in opts or "L" in opts or "c" in opts
        for idx, line in enumerate(lines):
            if self.max_count is not None and count >= self.max_count:
                if pending_after and not quiet_kinds and not binary:
                    if not self.selected(line):
                        out.append(self.prefix(name, idx + 1, offsets[idx], "-") + line)
                        last_printed = idx
                        pending_after -= 1
                        continue
                break
            if self.selected(line):
                count += 1
                self.any_selected = True
                if "q" in opts:
                    self.quit = True
                    return
                if quiet_kinds or binary:
                    if "l" in opts or "L" in opts:
                        break
                    continue
                start = max(idx - self.before, last_printed + 1)
                if out and start > last_printed + 1 and (self.before or self.after) and self.group_sep is not None:
                    out.append(self.group_sep)
                elif not out and (self.before or self.after) and self.sep_printed and start <= idx \
                        and self.group_sep is not None:
                    out.append(self.group_sep)
                for k in range(start, idx):
                    out.append(self.prefix(name, k + 1, offsets[k], "-") + lines[k])
                if "o" in opts:
                    if "v" not in opts:
                        for m in self.rx.finditer(line):
                            if m.group(0):
                                out.append(self.prefix(name, idx + 1, offsets[idx] + len(line[:m.start()].encode()), ":")
                                           + m.group(0))
                else:
                    out.append(self.prefix(name, idx + 1, offsets[idx], ":") + line)
                last_printed = idx
                pending_after = self.after
            elif pending_after and not quiet_kinds and not binary:
                out.append(self.prefix(name, idx + 1, offsets[idx], "-") + line)
                last_printed = idx
                pending_after -= 1
        if "c" in opts:
            self.io.out((name + (":" if "Z" not in opts else "\0") if self.with_name else "") + f"{count}\n")
        if "l" in opts and count:
            self.io.out(name + ("\0" if "Z" in opts else "\n"))
        if "L" in opts and not count:
            self.io.out(name + ("\0" if "Z" in opts else "\n"))
        if binary and count and not quiet_kinds:
            self.io.out(f"Двоичный файл {name} совпадает\n")
            return
        if out:
            if self.before or self.after:
                self.sep_printed = True
            self.io.out("\n".join(out) + "\n")

    def grep_file(self, shown, vrel, explicit):
        sb = self.ctx.sb
        opts = self.opts
        if self.quit:
            return
        if not sb.lexists(vrel) or not sb.exists(vrel):
            if explicit:
                self.err(f"grep: {shown}: Нет такого файла или каталога")
            return
        if sb.isdir(vrel):
            if "r" in opts or "R" in opts:
                self.walk(shown, vrel, explicit_root=explicit)
            elif opts.get("d") == "skip":
                pass
            else:
                self.err(f"grep: {shown}: Это каталог")
            return
        base = os.path.basename(shown)
        if opts["include"] and not any(fnmatch.fnmatchcase(base, g) for g in opts["include"]):
            return
        if any(fnmatch.fnmatchcase(base, g) for g in opts["exclude"]):
            return
        try:
            text, binary = sb.read_text(vrel, self.ctx.priv)
        except FsError as e:
            self.err(f"grep: {shown}: {e}")
            return
        if binary:
            mode = "text" if "a" in opts else ("without-match" if "I" in opts else opts.get("binary-files", "binary"))
            if mode == "without-match":
                return
            if mode == "text":
                binary = False
        self.grep_text(shown, text, binary)

    def walk(self, shown, vrel, explicit_root):
        sb = self.ctx.sb
        if self.auto_name:
            self.with_name = True
        try:
            names = sb.listdir(vrel, self.ctx.priv)
        except FsError as e:
            self.err(f"grep: {shown}: {e}")
            return
        for name in names:
            if self.quit:
                return
            child_vrel = f"{vrel}/{name}" if vrel else name
            if shown == "":
                child_shown = name
            elif shown.endswith("/"):
                child_shown = shown + name
            else:
                child_shown = shown + "/" + name
            is_link = sb.islink(child_vrel)
            if sb.isdir(child_vrel):
                if is_link and "R" not in self.opts:
                    continue
                if any(fnmatch.fnmatchcase(name, g) for g in self.opts["exclude-dir"]):
                    continue
                self.walk(child_shown, child_vrel, False)
            else:
                if is_link and "R" not in self.opts:
                    continue
                self.grep_file(child_shown, child_vrel, False)


def run_grep(ctx, argv, io, mode=None):
    try:
        opts, operands = parse_args(argv, mode)
        patterns = []
        for p in opts["e"]:
            patterns.extend(p.split("\n"))
        for fname in opts["f"]:
            text = ctx.read_input("grep", fname, io)
            if text is None:
                return 2
            patterns.extend(text.split("\n")[:-1] if text.endswith("\n") else text.split("\n") if text else [])
        if not opts["e"] and not opts["f"]:
            if not operands:
                io.err("Использование: grep [КЛЮЧ]… ШАБЛОНЫ [ФАЙЛ]…\nЗапустите «man grep» для получения справки.")
                return 2
            patterns.extend(operands.pop(0).split("\n"))
        rx = build_matcher(patterns, opts)
        g = Grep(ctx, io, opts, rx)
    except Usage as e:
        io.err(str(e))
        return 2

    recursive = "r" in opts or "R" in opts
    files = operands
    if not files:
        files = ["."] if recursive else ["-"]
    # Как в GNU: с -r имя файла выводится, только если обходится каталог (или файлов несколько).
    g.with_name = "H" in opts or (len(files) > 1 and "h" not in opts)
    g.auto_name = recursive and "h" not in opts and "H" not in opts
    for name in files:
        if g.quit:
            break
        if name == "-":
            g.grep_text(opts.get("label", "(стандартный ввод)"), io.stdin or "", False)
            continue
        try:
            vrel = ctx.resolve(name)
        except FsError as e:
            g.err(f"grep: {name}: {e}")
            continue
        if recursive and not operands and name == ".":
            if ctx.sb.isdir(vrel):
                g.walk("", vrel, True)
            continue
        g.grep_file(name, vrel, True)
    if g.any_selected and ("q" in opts or not g.error):
        return 0
    return 2 if g.error else 1


def cmd_grep(ctx, argv, io):
    return run_grep(ctx, argv, io)


def cmd_egrep(ctx, argv, io):
    return run_grep(ctx, argv, io, "E")


def cmd_fgrep(ctx, argv, io):
    return run_grep(ctx, argv, io, "F")
