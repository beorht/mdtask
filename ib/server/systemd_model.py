"""
Модель служб и таймеров systemd для задания №11 «procs» — generic-юниты, которых нет в ssh-логике
(cmd_admin.py управляет ssh через sshd_sim). Юниты берутся из unit-файлов песочницы
(etc/systemd/system/*.service|*.timer и /lib/systemd/system), а их состояние (активна/включена/сбой) —
из var/lib/seclab/units.json: {"units": {"<name>": {"active": bool, "enabled": bool, "failed": bool}}}.
Нет файла состояния — служба считается неактивной, «включена» выводится по наличию секции [Install].
Команды list-units/list-unit-files/--failed/list-timers/cat/status (cmd_admin.cmd_systemctl) читают это.
"""

import json
from pathlib import Path

UNIT_DIRS = ["etc/systemd/system", "lib/systemd/system", "usr/lib/systemd/system"]
STATE_FILE = "var/lib/seclab/units.json"


def _read(p):
    try:
        return p.read_text(encoding="utf-8")
    except OSError:
        return None


def _field(text, section, key):
    """Значение key из секции [section] простого unit-файла (ini-подобный)."""
    cur = None
    for line in (text or "").splitlines():
        s = line.strip()
        if s.startswith("[") and s.endswith("]"):
            cur = s[1:-1]
            continue
        if cur == section and "=" in s and not s.startswith("#"):
            k, v = s.split("=", 1)
            if k.strip() == key:
                return v.strip()
    return None


def units_view(root):
    """Список юнитов песочницы с состоянием. -> [{name, kind, desc, exec, activates, schedule,
    active, enabled, failed, text, path}]."""
    root = Path(root)
    try:
        state = json.loads((root / STATE_FILE).read_text(encoding="utf-8")).get("units", {})
    except (OSError, ValueError):
        state = {}
    seen, out = set(), []
    for d in UNIT_DIRS:
        base = root / d
        if not base.is_dir():
            continue
        for p in sorted(base.glob("*.service")) + sorted(base.glob("*.timer")):
            if p.name in seen:
                continue
            seen.add(p.name)
            text = _read(p) or ""
            st = state.get(p.name, {})
            kind = "timer" if p.name.endswith(".timer") else "service"
            out.append({
                "name": p.name,
                "kind": kind,
                "desc": _field(text, "Unit", "Description") or "",
                "exec": _field(text, "Service", "ExecStart") or "",
                "activates": _field(text, "Timer", "Unit") or (p.name[:-6] + ".service" if kind == "timer" else ""),
                "schedule": _field(text, "Timer", "OnCalendar") or _field(text, "Timer", "OnUnitActiveSec")
                or _field(text, "Timer", "OnBootSec") or "",
                "active": bool(st.get("active", False)),
                "enabled": bool(st.get("enabled", "[Install]" in text)),
                "failed": bool(st.get("failed", False)),
                "text": text,
                "path": f"/{d}/{p.name}",
            })
    return out


def find(units, name):
    want = name if "." in name else name + ".service"
    for u in units:
        if u["name"] == want:
            return u
    return None


def _act_sub(u):
    if u["failed"]:
        return "failed", "failed"
    if u["active"]:
        return "active", "running"
    return "inactive", "dead"


# ----------------------------------------------------------------- вывод ---

def format_units(units, running_only=False):
    lines = ["  UNIT                         LOAD   ACTIVE   SUB     DESCRIPTION"]
    for u in units:
        if u["kind"] != "service":
            continue
        act, sub = _act_sub(u)
        if running_only and sub != "running":
            continue
        lines.append(f"  {u['name']:<28} loaded {act:<8} {sub:<7} {u['desc']}")
    return "\n".join(lines) + "\n"


def format_unit_files(units):
    lines = ["UNIT FILE                    STATE"]
    for u in units:
        lines.append(f"{u['name']:<28} {'enabled' if u['enabled'] else 'disabled'}")
    return "\n".join(lines) + "\n"


def format_failed(units):
    bad = [u for u in units if u["failed"]]
    if not bad:
        return "0 loaded units listed.\n"
    lines = ["  UNIT                         LOAD   ACTIVE SUB    DESCRIPTION"]
    for u in bad:
        lines.append(f"  {u['name']:<28} loaded failed failed {u['desc']}")
    return "\n".join(lines) + "\n"


def format_timers(units):
    timers = [u for u in units if u["kind"] == "timer"]
    lines = ["NEXT  LEFT  LAST  PASSED  UNIT                     ACTIVATES"]
    for u in timers:
        sched = f" ({u['schedule']})" if u["schedule"] else ""
        lines.append(f"-     -     -     -       {u['name']:<24} {u['activates']}{sched}")
    lines.append("")
    lines.append(f"{len(timers)} timers listed.")
    return "\n".join(lines) + "\n"


def format_status(u):
    act, sub = _act_sub(u)
    dot = "●" if u["active"] else "×" if u["failed"] else "○"
    state = f"active ({sub})" if u["active"] else "failed (Result: exit-code)" if u["failed"] else "inactive (dead)"
    out = [
        f"{dot} {u['name']} - {u['desc']}",
        f"     Loaded: loaded ({u['path']}; {'enabled' if u['enabled'] else 'disabled'}; preset: enabled)",
        f"     Active: {state}",
    ]
    if u["exec"]:
        out.append(f"   Process: ExecStart={u['exec']}")
        out.append(f"     CGroup: /system.slice/{u['name']}")
    return "\n".join(out) + "\n"
