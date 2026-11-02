"""
Модель «запущенных процессов» и сетевых сокетов учебного сервера (для задания №11 «procs»).

Состояние задаёт генератор в файле песочницы var/lib/seclab/procs.json:

  {
    "procs":   [ {pid, ppid, user, cpu, mem, cmd, exe, lstart, etime,
                  (необязательно: group, vsz, rss, tty, stat, start, time)} ... ],
    "sockets": [ {proto: "tcp"|"udp", state: "LISTEN"|"ESTAB", local: "0.0.0.0:22",
                  peer: "0.0.0.0:*", pid, program} ... ]
  }

Нет файла — процессов и сокетов нет (ps/ss выводят пустой список). Команды ps/ss (cmd_proc.py)
читают это состояние; /proc/<PID>/{exe,cmdline} материализуются настоящими файлами (write_proc_fs),
поэтому `readlink /proc/PID/exe`, `cat /proc/PID/cmdline` и `ls /proc` работают через обычный vfs.
"""

import json
import os
from pathlib import Path

STATE_FILE = "var/lib/seclab/procs.json"


def _norm_proc(p):
    pid = int(p.get("pid", 0))
    cmd = str(p.get("cmd", ""))
    exe = str(p.get("exe", ""))
    comm = p.get("comm") or (os.path.basename(exe) if exe else (cmd.split(" ")[0] if cmd else ""))
    user = str(p.get("user", "root"))
    return {
        "pid": pid,
        "ppid": int(p.get("ppid", 1)),
        "user": user,
        "group": str(p.get("group", user)),
        "cpu": float(p.get("cpu", 0.0)),
        "mem": float(p.get("mem", 0.0)),
        "vsz": int(p.get("vsz", 0)),
        "rss": int(p.get("rss", 0)),
        "tty": str(p.get("tty", "?")),
        "stat": str(p.get("stat", "S")),
        "start": str(p.get("start", "")),
        "time": str(p.get("time", "0:00")),
        "lstart": str(p.get("lstart", "")),
        "etime": str(p.get("etime", "")),
        "cmd": cmd,
        "comm": str(comm).lstrip("[").rstrip("]"),
        "exe": exe,
    }


def load(root):
    """-> {'procs': [...], 'sockets': [...]} из песочницы (root — путь к корню)."""
    try:
        data = json.loads((Path(root) / STATE_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"procs": [], "sockets": []}
    procs = [_norm_proc(x) for x in (data.get("procs") or []) if isinstance(x, dict)]
    sockets = [x for x in (data.get("sockets") or []) if isinstance(x, dict)]
    return {"procs": procs, "sockets": sockets}


# ------------------------------------------------------------------ ps ---

AUX_HEADER = ["USER", "PID", "%CPU", "%MEM", "VSZ", "RSS", "TTY", "STAT", "START", "TIME", "COMMAND"]


def _sort_procs(procs, sort):
    """--sort=-%cpu | %mem | -pid ... : минус — по убыванию."""
    if not sort:
        return procs
    desc = sort.startswith("-")
    if sort[:1] in "+-":
        sort = sort[1:]
    keymap = {"%cpu": "cpu", "pcpu": "cpu", "cpu": "cpu", "%mem": "mem", "pmem": "mem", "mem": "mem",
              "pid": "pid", "ppid": "ppid", "rss": "rss", "vsz": "vsz"}
    key = keymap.get(sort.lower())
    if not key:
        return procs
    return sorted(procs, key=lambda p: p[key], reverse=desc)


def format_aux(procs, sort=None):
    rows = [AUX_HEADER[:]]
    for p in _sort_procs(procs, sort):
        rows.append([
            p["user"], str(p["pid"]), f'{p["cpu"]:.1f}', f'{p["mem"]:.1f}', str(p["vsz"]),
            str(p["rss"]), p["tty"], p["stat"], p["start"], p["time"], p["cmd"],
        ])
    return _table(rows, right={1, 2, 3, 4, 5})


FIELDS = {
    "pid": ("PID", lambda p: str(p["pid"]), True),
    "ppid": ("PPID", lambda p: str(p["ppid"]), True),
    "user": ("USER", lambda p: p["user"], False),
    "group": ("GROUP", lambda p: p["group"], False),
    "comm": ("COMMAND", lambda p: p["comm"], False),
    "cmd": ("CMD", lambda p: p["cmd"], False),
    "args": ("COMMAND", lambda p: p["cmd"], False),
    "%cpu": ("%CPU", lambda p: f'{p["cpu"]:.1f}', True),
    "pcpu": ("%CPU", lambda p: f'{p["cpu"]:.1f}', True),
    "%mem": ("%MEM", lambda p: f'{p["mem"]:.1f}', True),
    "pmem": ("%MEM", lambda p: f'{p["mem"]:.1f}', True),
    "lstart": ("STARTED", lambda p: p["lstart"], False),
    "etime": ("ELAPSED", lambda p: p["etime"], True),
    "stat": ("STAT", lambda p: p["stat"], False),
    "tty": ("TT", lambda p: p["tty"], False),
    "time": ("TIME", lambda p: p["time"], True),
    "start": ("START", lambda p: p["start"], False),
}


def format_select(procs, pids, fields):
    """ps [-p PID…] -o f1,f2,…  Заголовок скрывается, если у всех полей задан пустой (f=)."""
    chosen = [p for p in procs if pids is None or p["pid"] in pids]
    cols, headers, any_custom, all_empty = [], [], False, True
    for tok in fields:
        name, sep, custom = tok.partition("=")
        name = name.strip().lower()
        spec = FIELDS.get(name)
        if spec is None:
            continue
        hdr, getter, right = spec
        if sep:
            any_custom = True
            hdr = custom
        if hdr:
            all_empty = False
        cols.append((getter, right))
        headers.append(hdr)
    if not cols:
        return ""
    rows = []
    if not (any_custom and all_empty):
        rows.append([h for h in headers])
    right = {i for i, (_, r) in enumerate(cols) if r}
    for p in chosen:
        rows.append([g(p) for g, _ in cols])
    return _table(rows, right=right)


def _table(rows, right=frozenset()):
    if not rows:
        return ""
    ncol = max(len(r) for r in rows)
    widths = [0] * ncol
    for r in rows:
        for i, c in enumerate(r):
            widths[i] = max(widths[i], len(str(c)))
    out = []
    for r in rows:
        cells = []
        for i, c in enumerate(r):
            c = str(c)
            # последний столбец (команда) не дополняем пробелами справа
            if i == len(r) - 1 and i not in right:
                cells.append(c)
            elif i in right:
                cells.append(c.rjust(widths[i]))
            else:
                cells.append(c.ljust(widths[i]))
        out.append(" ".join(cells).rstrip())
    return "\n".join(out) + "\n"


# ------------------------------------------------------------------ ss ---

SS_HEADER = ["Netid", "State", "Recv-Q", "Send-Q", "Local Address:Port", "Peer Address:Port", "Process"]


def format_ss(sockets, listening=False, all_states=False, protos=("tcp", "udp"), show_proc=False):
    rows = [SS_HEADER[:] if show_proc else SS_HEADER[:-1]]
    for s in sockets:
        proto = str(s.get("proto", "tcp")).lower()
        state = str(s.get("state", "")).upper()
        if proto not in protos:
            continue
        if not all_states:
            is_listen = state in ("LISTEN", "UNCONN")
            if listening and not is_listen:
                continue
            if not listening and is_listen:
                continue
        row = [proto, state or "-", "0", "0", str(s.get("local", "")), str(s.get("peer", "*:*"))]
        if show_proc:
            pid, prog = s.get("pid"), s.get("program", "")
            row.append(f'users:(("{prog}",pid={pid},fd=3))' if pid else "")
        rows.append(row)
    return _table(rows, right={2, 3})


# -------------------------------------------------- генератор: запись ---

def write_state(root, procs, sockets):
    root = Path(root)
    (root / "var/lib/seclab").mkdir(parents=True, exist_ok=True)
    p = root / STATE_FILE
    p.write_text(json.dumps({"procs": procs, "sockets": sockets}, ensure_ascii=False, indent=0),
                 encoding="utf-8")
    os.chmod(p, 0o644)


def write_proc_fs(root, procs):
    """Материализует /proc/<PID>/{cmdline,exe}: cmdline — настоящий файл, exe — символическая ссылка
    (абсолютная цель хранится как путь внутри песочницы — так же, как ln -s в vfs)."""
    root = Path(root)
    real_root = os.path.realpath(root)
    for p in procs:
        pid = int(p.get("pid", 0))
        if pid <= 0:
            continue
        d = root / "proc" / str(pid)
        d.mkdir(parents=True, exist_ok=True)
        # cmdline пишем читаемым (аргументы через пробел): в учебном cat это полезнее, чем NUL-разделители.
        (d / "cmdline").write_text(str(p.get("cmd", "")) + "\n", encoding="utf-8")
        os.chmod(d / "cmdline", 0o444)
        exe = str(p.get("exe", ""))
        link = d / "exe"
        if exe and not link.exists() and not link.is_symlink():
            target = os.path.join(real_root, exe.lstrip("/"))
            try:
                os.symlink(target, link)
            except OSError:
                pass
