"""
Команды для работы с журналами (задание №8 «Расследование по журналам», но доступны везде):
zcat, zgrep, tr, date -d (с TZ= и часовыми поясами), iptables (подмножество: блокировка адресов),
journalctl --verify --file (проверка цепочки контрольных сумм журнала приложения).

Состояние iptables хранится в /etc/iptables/rules.v4 песочницы в формате iptables-save,
поэтому его видно и через cat, а проверка задания читает тот же файл.
"""

import calendar
import gzip
import hashlib
import ipaddress
import re
import time
from datetime import datetime, timedelta, timezone

from vfs import FsError

# ------------------------------------------------------------- часовые пояса ---

# Без zoneinfo: на учебном сервере нужны пояса без перехода на летнее время.
ZONES = {
    "utc": 0, "etc/utc": 0, "gmt": 0, "etc/gmt": 0, "z": 0, "universal": 0,
    "asia/tashkent": 5, "asia/samarkand": 5, "asia/almaty": 5, "asia/yekaterinburg": 5,
    "europe/moscow": 3, "asia/dubai": 4, "asia/novosibirsk": 7,
}
ZONE_ABBR = {0: "UTC"}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DEFAULT_YEAR = 2026


def zone_offset(name):
    """Смещение пояса в часах или None, если пояс неизвестен."""
    if name is None:
        return None
    key = name.strip().lower()
    if key in ZONES:
        return ZONES[key]
    m = re.fullmatch(r"(?:utc|gmt)?([+-])(\d{1,2})(?::?(\d{2}))?", key)
    if m:
        sign = 1 if m.group(1) == "+" else -1
        return sign * (int(m.group(2)) + int(m.group(3) or 0) / 60)
    m = re.fullmatch(r"etc/gmt([+-])(\d{1,2})", key)   # Etc/GMT-5 — это UTC+5 (знак обратный)
    if m:
        return (-1 if m.group(1) == "+" else 1) * int(m.group(2))
    return None


def tz_of(hours):
    return timezone(timedelta(hours=hours))


def system_zone(ctx):
    """Пояс сервера: TZ= перед командой, иначе /etc/timezone песочницы, иначе UTC."""
    tz = ctx.env.get("TZ")
    if tz:
        off = zone_offset(tz)
        return (off if off is not None else 0), tz
    try:
        text, _ = ctx.sb.read_text(ctx.resolve("/etc/timezone"), True)
        name = text.strip().splitlines()[0] if text.strip() else "Etc/UTC"
    except (FsError, IndexError):
        name = "Etc/UTC"
    off = zone_offset(name)
    return (off if off is not None else 0), name


def abbr(hours):
    if hours == 0:
        return "UTC"
    sign = "+" if hours > 0 else "-"
    return f"{sign}{abs(int(hours)):02d}"


def parse_when(text, default_off):
    """Строка даты -> aware datetime. Понимает ISO, syslog (Nov 19 02:14:07), nginx (19/Nov/2026:07:14:07 +0500),
    @epoch, «now», с поясом в конце (UTC, Z, +0500, +05:00, Asia/Tashkent) или без (тогда default_off)."""
    s = " ".join(text.strip().split())
    if not s or s.lower() == "now":
        return datetime.now(timezone.utc)
    if s.startswith("@"):
        return datetime.fromtimestamp(float(s[1:]), timezone.utc)
    off = None
    m = re.search(r"\s*(Z|UTC|GMT|[+-]\d{2}:?\d{2}|[+-]\d{2}|[A-Za-z]+/[A-Za-z_]+)$", s)
    if m and zone_offset(m.group(1)) is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        off = zone_offset(m.group(1))
        s = s[:m.start()].strip()
    s = re.sub(r"T", " ", s) if re.match(r"\d{4}-\d{2}-\d{2}T", s) else s
    m = re.fullmatch(r"(\d{2})/([A-Za-z]{3})/(\d{4}):(\d{2}):(\d{2}):(\d{2})", s)
    if m:
        s = f"{m.group(3)}-{MONTHS.index(m.group(2).title()) + 1:02d}-{m.group(1)} {m.group(4)}:{m.group(5)}:{m.group(6)}"
    m = re.fullmatch(r"([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s+(\d{4}))?", s)
    if m and m.group(1).title() in MONTHS:
        s = (f"{m.group(6) or DEFAULT_YEAR}-{MONTHS.index(m.group(1).title()) + 1:02d}-{int(m.group(2)):02d} "
             f"{int(m.group(3)):02d}:{m.group(4)}:{m.group(5)}")
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%H:%M:%S", "%H:%M"):
        try:
            dt = datetime.strptime(s, fmt)
        except ValueError:
            continue
        if fmt.startswith("%H"):
            today = datetime.now(tz_of(default_off))
            dt = dt.replace(year=today.year, month=today.month, day=today.day)
        return dt.replace(tzinfo=tz_of(default_off if off is None else off))
    raise ValueError(text)


def format_when(dt, fmt, off):
    local = dt.astimezone(tz_of(off))
    fmt = fmt.replace("%Z", abbr(off)).replace("%:z", local.strftime("%z")[:3] + ":" + local.strftime("%z")[3:])
    fmt = fmt.replace("%s", str(calendar.timegm(dt.utctimetuple())))
    # %a/%b — английские сокращения, как в локали C на сервере
    fmt = fmt.replace("%a", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][local.weekday()])
    fmt = fmt.replace("%b", MONTHS[local.month - 1]).replace("%h", MONTHS[local.month - 1])
    return local.strftime(fmt)


def cmd_date(ctx, argv, io):
    args = argv[1:]
    when = None
    utc = False
    fmt = None
    i = 0
    while i < len(args):
        a = args[i]
        if a in ("-u", "--utc", "--universal"):
            utc = True
        elif a in ("-d", "--date"):
            if i + 1 >= len(args):
                io.err("date: ключ требует аргумент -- «d»")
                return 1
            when = args[i + 1]
            i += 1
        elif a.startswith("--date="):
            when = a[len("--date="):]
        elif a.startswith("-d") and len(a) > 2:
            when = a[2:]
        elif a == "-R":
            fmt = "%a, %d %b %Y %H:%M:%S %z"
        elif a in ("-I", "--iso-8601"):
            fmt = "%Y-%m-%d"
        elif a.startswith("+"):
            fmt = a[1:]
        else:
            io.err(f"date: неверный аргумент «{a}»\nИспользование: date [-u] [-d СТРОКА] [+ФОРМАТ]")
            return 1
        i += 1
    off, _ = system_zone(ctx)
    if utc:
        off = 0
    if when is None and fmt is None and not utc and "TZ" not in ctx.env:
        # как раньше: текущее время сервера
        io.out(time.strftime("%a %b %d %Y %H:%M:%S GMT%z") + "\n")
        return 0
    try:
        dt = parse_when(when or "now", system_zone(ctx)[0])
    except (ValueError, OverflowError):
        io.err(f"date: неверная дата «{when}»")
        return 1
    io.out(format_when(dt, fmt or "%a %b %d %H:%M:%S %Z %Y", off) + "\n")
    return 0


# ---------------------------------------------------------------- gzip ---

def _read_maybe_gz(ctx, cmd, name, io, must_gz):
    if name == "-":
        return io.stdin or ""
    try:
        data = ctx.sb.read_bytes(ctx.resolve(name), ctx.priv)
    except FsError as e:
        io.err(f"{cmd}: {name}: {e}")
        return None
    if data[:2] == b"\x1f\x8b":
        try:
            data = gzip.decompress(data)
        except (OSError, EOFError):
            io.err(f"{cmd}: {name}: файл повреждён")
            return None
    elif must_gz:
        io.err(f"gzip: {name}: not in gzip format")
        return None
    return data.decode("utf-8", errors="replace")


def cmd_zcat(ctx, argv, io):
    files = [a for a in argv[1:] if a not in ("-f", "--force")]
    force = len(files) != len(argv) - 1
    if not files:
        files = ["-"]
    status = 0
    for name in files:
        text = _read_maybe_gz(ctx, "zcat", name, io, must_gz=not force)
        if text is None:
            status = 1
            continue
        io.out(text)
    return status


def cmd_zgrep(ctx, argv, io):
    from cmd_grep import Grep, Usage, build_matcher, parse_args
    try:
        opts, operands = parse_args(argv)
        patterns = []
        for p in opts["e"]:
            patterns.extend(p.split("\n"))
        if not opts["e"]:
            if not operands:
                io.err("Использование: zgrep [КЛЮЧ]… ШАБЛОН [ФАЙЛ]…")
                return 2
            patterns.extend(operands.pop(0).split("\n"))
        rx = build_matcher(patterns, opts)
        g = Grep(ctx, io, opts, rx)
    except Usage as e:
        io.err(str(e).replace("grep", "zgrep"))
        return 2
    files = operands or ["-"]
    g.with_name = "H" in opts or (len(files) > 1 and "h" not in opts)
    for name in files:
        if g.quit:
            break
        text = _read_maybe_gz(ctx, "zgrep", name, io, must_gz=False)
        if text is None:
            g.error = True
            continue
        g.grep_text(name if name != "-" else "(стандартный ввод)", text, False)
    if g.any_selected and ("q" in opts or not g.error):
        return 0
    return 2 if g.error else 1


# ------------------------------------------------------------------ tr ---

CLASSES = {
    "upper": "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "lower": "abcdefghijklmnopqrstuvwxyz",
    "digit": "0123456789", "space": " \t\n\r\v\f", "blank": " \t",
    "alpha": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    "alnum": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    "punct": "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
}
ESC = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", "v": "\v", "f": "\f"}


def tr_set(spec):
    out = []
    i = 0
    while i < len(spec):
        m = re.match(r"\[:([a-z]+):\]", spec[i:])
        if m and m.group(1) in CLASSES:
            out.extend(CLASSES[m.group(1)])
            i += m.end()
            continue
        ch = spec[i]
        if ch == "\\" and i + 1 < len(spec):
            ch = ESC.get(spec[i + 1], spec[i + 1])
            i += 2
        else:
            i += 1
        if i + 1 < len(spec) and spec[i] == "-" and spec[i + 1] != "":
            end = spec[i + 1]
            step = 2
            if end == "\\" and i + 2 < len(spec):
                end = ESC.get(spec[i + 2], spec[i + 2])
                step = 3
            if ord(end) >= ord(ch):
                out.extend(chr(c) for c in range(ord(ch), ord(end) + 1))
                i += step
                continue
        out.append(ch)
    return out


def cmd_tr(ctx, argv, io):
    args = argv[1:]
    delete = squeeze = complement = False
    while args and re.fullmatch(r"-[dsc]+", args[0]):
        delete |= "d" in args[0]
        squeeze |= "s" in args[0]
        complement |= "c" in args[0]
        args = args[1:]
    if not args or (not delete and not squeeze and len(args) < 2) or len(args) > 2:
        io.err("tr: неверные аргументы\nИспользование: tr [-d] [-s] [-c] НАБОР1 [НАБОР2]")
        return 1
    set1 = tr_set(args[0])
    set2 = tr_set(args[1]) if len(args) > 1 else []
    text = io.stdin or ""
    in1 = (lambda c: c not in set1) if complement else (lambda c: c in set1)
    if delete:
        text = "".join(c for c in text if not in1(c))
        squeeze_set = set(set2)
    elif set2 and not complement:
        table = {}
        for k, c in enumerate(set1):
            table[c] = set2[min(k, len(set2) - 1)]
        text = "".join(table.get(c, c) for c in text)
        squeeze_set = set(set2)
    else:
        squeeze_set = None
        if complement and set2:
            text = "".join(c if c in set1 else set2[-1] for c in text)
            squeeze_set = {set2[-1]}
    if squeeze:
        target = squeeze_set if squeeze_set is not None else set(set1)
        out = []
        for c in text:
            if out and c == out[-1] and c in target:
                continue
            out.append(c)
        text = "".join(out)
    io.out(text)
    return 0


# ------------------------------------------------------------ iptables ---

RULES = "etc/iptables/rules.v4"
CHAINS = ("INPUT", "FORWARD", "OUTPUT")
TARGETS = ("DROP", "REJECT", "ACCEPT")


def load_rules(sb):
    """Правила из rules.v4: список (цепочка, сеть, цель)."""
    try:
        text, _ = sb.read_text(RULES, True)
    except FsError:
        return []
    rules = []
    for line in text.splitlines():
        m = re.match(r"-A\s+(\S+)\s+-s\s+(\S+)\s+-j\s+(\S+)", line.strip())
        if m:
            try:
                rules.append((m.group(1), str(ipaddress.ip_network(m.group(2), strict=False)), m.group(3)))
            except ValueError:
                continue
    return rules


def rules_text(rules):
    lines = ["# Generated by iptables-save v1.8.9", "*filter"]
    lines += [f":{c} ACCEPT [0:0]" for c in CHAINS]
    lines += [f"-A {c} -s {net} -j {t}" for c, net, t in rules]
    lines += ["COMMIT", ""]
    return "\n".join(lines)


def blocked(rules, ip, chain="INPUT"):
    """Будет ли пакет с адреса ip отброшен (первое подходящее правило, политика ACCEPT)."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for c, net, target in rules:
        if c == chain and addr in ipaddress.ip_network(net):
            return target in ("DROP", "REJECT")
    return False


def cmd_iptables(ctx, argv, io):
    if not ctx.priv:
        io.err("iptables v1.8.9 (nf_tables): Could not fetch rule set generation id: "
               "Permission denied (you must be root)\n(нужны права root: sudo iptables ...)")
        return 4
    args = argv[1:]
    if not args or args[0] in ("-h", "--help"):
        io.out("Использование (учебный iptables):\n"
               "  sudo iptables -A INPUT -s АДРЕС[/МАСКА] -j DROP   — добавить правило в конец\n"
               "  sudo iptables -I INPUT -s АДРЕС[/МАСКА] -j DROP   — добавить правило в начало\n"
               "  sudo iptables -D INPUT -s АДРЕС[/МАСКА] -j DROP   — удалить правило (или -D INPUT НОМЕР)\n"
               "  sudo iptables -L [INPUT] [-n] [--line-numbers]   — список правил\n"
               "  sudo iptables -S                                  — правила в виде команд\n"
               "  sudo iptables -F [INPUT]                          — удалить все правила\n")
        return 0
    rules = load_rules(ctx.sb)
    action = args[0]
    rest = args[1:]

    def opt(name):
        if name in rest:
            k = rest.index(name)
            return rest[k + 1] if k + 1 < len(rest) else None
        return None

    def save(new):
        if not ctx.sb.isdir("etc/iptables"):
            ctx.sb.mkdir("etc/iptables", True)
        ctx.sb.write_text(RULES, rules_text(new), True)
        ctx.wrote = True

    if action in ("-L", "--list", "-S", "--list-rules"):
        chain = rest[0] if rest and not rest[0].startswith("-") else None
        numbers = "--line-numbers" in rest
        if action in ("-S", "--list-rules"):
            out = [f"-P {c} ACCEPT" for c in CHAINS if chain in (None, c)]
            out += [f"-A {c} -s {n} -j {t}" for c, n, t in rules if chain in (None, c)]
            io.out("\n".join(out) + "\n")
            return 0
        for c in CHAINS:
            if chain not in (None, c):
                continue
            io.out(f"Chain {c} (policy ACCEPT)\n")
            io.out(("num  " if numbers else "") + "target     prot opt source               destination\n")
            k = 0
            for rc, net, target in rules:
                if rc != c:
                    continue
                k += 1
                src = net[:-3] if net.endswith("/32") else net
                io.out((f"{k:<4} " if numbers else "") + f"{target:<10} all  --  {src:<20} 0.0.0.0/0\n")
            if chain is None and c != CHAINS[-1]:
                io.out("\n")
        return 0
    if action in ("-F", "--flush"):
        chain = rest[0] if rest else None
        save([r for r in rules if chain is not None and r[0] != chain])
        return 0
    if action in ("-A", "--append", "-I", "--insert", "-D", "--delete"):
        if not rest or rest[0] not in CHAINS:
            io.err(f"iptables: укажите цепочку INPUT, FORWARD или OUTPUT: iptables {action} INPUT -s АДРЕС -j DROP")
            return 2
        chain = rest[0]
        if action in ("-D", "--delete") and len(rest) == 2 and rest[1].isdigit():
            own = [r for r in rules if r[0] == chain]
            n = int(rest[1])
            if not 1 <= n <= len(own):
                io.err("iptables: Index of deletion too big.")
                return 1
            victim = own[n - 1]
            rules.remove(victim)
            save(rules)
            return 0
        src = opt("-s") or opt("--source")
        target = opt("-j") or opt("--jump")
        if not src or not target:
            io.err(f"iptables: нужны -s АДРЕС и -j ЦЕЛЬ, например: iptables {action} {chain} -s 203.0.113.5 -j DROP")
            return 2
        if target not in TARGETS:
            io.err(f"iptables: цель «{target}» не поддерживается (DROP, REJECT, ACCEPT)")
            return 2
        try:
            net = str(ipaddress.ip_network(src, strict=False))
        except ValueError:
            io.err(f"iptables v1.8.9 (nf_tables): host/network `{src}' not found")
            return 2
        rule = (chain, net, target)
        if action in ("-D", "--delete"):
            if rule not in rules:
                io.err("iptables: Bad rule (does a matching rule exist in that chain?).")
                return 1
            rules.remove(rule)
        elif action in ("-I", "--insert"):
            rules.insert(0, rule)
        else:
            rules.append(rule)
        save(rules)
        return 0
    io.err(f"iptables: ключ «{action}» не поддерживается в учебном терминале. Справка: iptables -h")
    return 2


# ----------------------------------------------- целостность журнала ---

CHAIN_RE = re.compile(r"\bseq=(\d+)\s+prev=([0-9a-f]{12})\b")


def chain_hash(line):
    return hashlib.sha256(line.encode("utf-8")).hexdigest()[:12]


def verify_chain(text):
    """Номера seq строк, у которых prev не совпадает с хешем предыдущей строки файла."""
    bad = []
    prev_line = None
    for line in text.split("\n"):
        if not line:
            continue
        m = CHAIN_RE.search(line)
        if not m:
            continue
        if prev_line is not None and m.group(2) != chain_hash(prev_line):
            bad.append(int(m.group(1)))
        prev_line = line
    return bad


def journal_verify(ctx, argv, io):
    files = [a.split("=", 1)[1] for a in argv if a.startswith("--file=")]
    if "--file" in argv:
        k = argv.index("--file")
        if k + 1 < len(argv):
            files.append(argv[k + 1])
    if not files:
        io.err("journalctl: укажите журнал: journalctl --verify --file /var/log/ПУТЬ/app.log")
        return 1
    status = 0
    for name in files:
        try:
            text, _ = ctx.sb.read_text(ctx.resolve(name), ctx.priv)
        except FsError as e:
            io.err(f"journalctl: {name}: {e}")
            status = 1
            continue
        lines = [x for x in text.split("\n") if CHAIN_RE.search(x)]
        if not lines:
            io.err(f"journalctl: {name}: в файле нет полей seq= и prev= — проверять нечего")
            status = 1
            continue
        bad = verify_chain(text)
        if not bad:
            io.out(f"PASS: {name} — цепочка из {len(lines)} записей не нарушена\n")
            continue
        for seq in bad:
            io.out(f"FAIL: {name}: запись seq={seq} — поле prev не совпадает с хешем предыдущей записи файла\n")
        io.out(f"Найдено нарушений цепочки: {len(bad)}. Записей в файле: {len(lines)}.\n")
        status = 1
    return status
