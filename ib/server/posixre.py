r"""
Перевод регулярных выражений POSIX (BRE — grep/sed по умолчанию, ERE — grep -E,
sed -E) в синтаксис модуля re.

BRE: ( ) { } | + ? — обычные символы, а \( \) \{ \} \| \+ \? — специальные
(расширения GNU); * в начале выражения — литерал; ^ и $ — якоря только в начале
и в конце. ERE: всё как в re, кроме классов [[:alpha:]] и \< \>.
"""

import re

CLASSES = {
    "alpha": "a-zA-ZЀ-ӿ",
    "digit": "0-9",
    "alnum": "a-zA-Z0-9Ѐ-ӿ",
    "upper": "A-ZЀ-Я",
    "lower": "a-zа-џ",
    "space": " \\t\\n\\r\\f\\v",
    "blank": " \\t",
    "punct": "!-/:-@\\[-`{-~",
    "xdigit": "0-9A-Fa-f",
    "cntrl": "\\x00-\\x1f\\x7f",
    "print": "\\x20-\\x7eЀ-ӿ",
    "graph": "\\x21-\\x7eЀ-ӿ",
    "word": "\\w",
}


class RegexError(Exception):
    pass


def _bracket(p, i):
    """p[i] == '['. Возвращает (класс для re, индекс после ']')."""
    j = i + 1
    out = "["
    if j < len(p) and p[j] == "^":
        out += "^"
        j += 1
    first = True
    while j < len(p):
        c = p[j]
        if c == "]" and not first:
            return out + "]", j + 1
        first = False
        if c == "[" and j + 1 < len(p) and p[j + 1] in ":=.":
            kind = p[j + 1]
            end = p.find(kind + "]", j + 2)
            if end == -1:
                raise RegexError("незакрытый класс символов [")
            name = p[j + 2:end]
            if kind == ":":
                if name not in CLASSES:
                    raise RegexError(f"неизвестный класс символов [:{name}:]")
                out += CLASSES[name]
            else:
                out += re.escape(name)
            j = end + 2
            continue
        if c in "\\[":
            out += "\\" + c
        elif c == "]":
            out += "\\]"
        else:
            out += c
        j += 1
    raise RegexError("непарная [ или [^")


def to_python(pattern, extended=False, multiline=False, emacs=False):
    """Регулярное выражение POSIX -> строка для re.compile.

    emacs=True — диалект find -regex по умолчанию: как BRE, но + и ? специальные,
    а \\+ \\? \\{ \\} — литералы.
    """
    p = pattern
    out = []
    i = 0
    n = len(p)
    at_start = True          # позиция, где * в BRE литерал, а ^ — якорь
    depth = 0
    while i < n:
        c = p[i]
        if c == "\\" and i + 1 < n:
            d = p[i + 1]
            i += 2
            if emacs and d in "+?{}":
                out.append("\\" + d)
                at_start = False
                continue
            if not extended and d in "(){}|+?":
                if d == "(":
                    depth += 1
                elif d == ")":
                    depth -= 1
                    if depth < 0:
                        raise RegexError("непарная ) или \\)")
                out.append(d)
                at_start = d in "(|"
                continue
            if d in "<>":
                out.append("\\b")
            elif d.isdigit():
                out.append("\\" + d)
            elif d == "n":
                out.append("\\n")
            elif d == "t":
                out.append("\\t")
            elif d in "wWsSbB":
                out.append("\\" + d)
            elif d == "`":
                out.append("\\A")
            elif d == "'":
                out.append("\\Z")
            else:
                out.append(re.escape(d))
            at_start = False
            continue
        if c == "[":
            cls, i = _bracket(p, i)
            out.append(cls)
            at_start = False
            continue
        if c == "^":
            if extended or at_start:
                out.append("^")
            else:
                out.append("\\^")
            i += 1
            continue
        if c == "$":
            rest = p[i + 1:]
            is_end = extended or rest == "" or rest.startswith("\\)") or rest.startswith("\\|")
            out.append(("$" if multiline else "(?!\\n)\\Z") if is_end else "\\$")
            i += 1
            at_start = False
            continue
        if c == "*" and at_start and not extended:
            out.append("\\*")
            i += 1
            at_start = False
            continue
        if emacs and c in "+?":
            out.append("\\" + c if at_start else c)
            i += 1
            at_start = False
            continue
        if not extended and c in "(){}|+?":
            out.append("\\" + c)
            i += 1
            at_start = False
            continue
        if extended and c in "()":
            depth += 1 if c == "(" else -1
            if depth < 0:
                raise RegexError("непарная ) или \\)")
            out.append(c)
            at_start = c == "("
            i += 1
            continue
        if extended and c == "|":
            out.append(c)
            at_start = True
            i += 1
            continue
        if c in "*+?" and at_start:      # ERE: квантификатор без операнда — литерал
            out.append("\\" + c)
        else:
            out.append(c if c in ".*+?{}" else re.escape(c))
        at_start = False
        i += 1
    if depth > 0:
        raise RegexError("непарная ( или \\(")
    return "".join(out)


def compile_posix(pattern, extended=False, ignore_case=False, multiline=False, perl=False, emacs=False):
    flags = (re.IGNORECASE if ignore_case else 0) | (re.MULTILINE if multiline else 0)
    try:
        source = pattern if perl else to_python(pattern, extended, multiline, emacs)
        return re.compile(source, flags)
    except re.error as e:
        raise RegexError(f"некорректное регулярное выражение: {e}")
