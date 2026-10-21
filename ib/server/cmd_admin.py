"""
Команды администрирования учебного сервера (задания №6 и №7):

  учётные записи — passwd -l/-u/-S, usermod -L/-U/-aG/-G/-s, gpasswd -a/-d, deluser, getent, groups, id;
  журналы входа  — last, lastb (учебные /var/log/wtmp и /var/log/btmp — текстовые JSON-строки);
  целостность    — sha256sum, md5sum (в т.ч. -c);
  SSH            — ssh (клиент: вход на этот же сервер), sshd -t / -T, ssh-keygen -l/-y/-t,
                   systemctl status/reload/restart/start/stop/is-active ssh, journalctl -u ssh.

Всё работает с файлами песочницы (/etc/passwd, /etc/shadow, /etc/group, /etc/ssh/...). Служба SSH
моделируется в sshd_sim.py: правка sshd_config начинает действовать только после
systemctl reload/restart, а клиент ssh проверяет вход по «работающим» настройкам.
"""

import hashlib
import json
import os
import posixpath
import secrets
import time

import accounts
import sshd_sim
from shell import cmd_id as shell_cmd_id, parse_short_flags
from vfs import FsError


def _need_root(ctx, io, cmd, msg=None):
    if ctx.priv:
        return False
    io.err(msg or f"{cmd}: недостаточно прав. Запустите команду через sudo: sudo {cmd} ...")
    return True


def _read(ctx, vrel, priv=None):
    """Текст файла песочницы или None (нет файла / нет прав)."""
    try:
        text, _ = ctx.sb.read_text(vrel, ctx.priv if priv is None else priv)
        return text
    except FsError:
        return None


def _write(ctx, vrel, text):
    ctx.sb.write_text(vrel, text, True)
    ctx.wrote = True


def _db(ctx):
    """(users, groups, shadow) — shadow читается с правами root (команды сами проверяют права)."""
    return (accounts.parse_passwd(_read(ctx, "etc/passwd", True)),
            accounts.parse_group(_read(ctx, "etc/group", True)),
            accounts.parse_shadow(_read(ctx, "etc/shadow", True)))


def _me(ctx):
    return "root" if ctx.priv else ctx.sb.user


# ======================================================== учётные записи ===

def cmd_id(ctx, argv, io):
    args = [a for a in argv[1:] if not a.startswith("-")]
    flags = "".join(a[1:] for a in argv[1:] if a.startswith("-"))
    users, groups, _ = _db(ctx)
    name = args[0] if args else _me(ctx)
    if not users or (not args and name not in users):
        return shell_cmd_id(ctx, argv, io)
    info = users.get(name)
    if info is None:
        io.err(f"id: «{name}»: нет такого пользователя")
        return 1
    names = accounts.user_groups(name, users, groups)
    if "G" in flags:
        io.out(" ".join(names if "n" in flags else [str(groups[g]["gid"]) for g in names]) + "\n")
        return 0
    primary = next((g for g, v in groups.items() if v["gid"] == info["gid"]), str(info["gid"]))
    all_g = ",".join(f"{groups[g]['gid']}({g})" for g in names)
    io.out(f"uid={info['uid']}({name}) gid={info['gid']}({primary}) группы={all_g}\n")
    return 0


def cmd_groups(ctx, argv, io):
    users, groups, _ = _db(ctx)
    names = argv[1:] or [_me(ctx)]
    status = 0
    for name in names:
        if name not in users:
            io.err(f"groups: «{name}»: нет такого пользователя")
            status = 1
            continue
        prefix = f"{name} : " if len(argv) > 1 else ""
        io.out(prefix + " ".join(accounts.user_groups(name, users, groups)) + "\n")
    return status


def cmd_getent(ctx, argv, io):
    if len(argv) < 2:
        io.err("Использование: getent БАЗА [КЛЮЧ...]   (БАЗА: passwd, group, shadow)")
        return 1
    db = argv[1]
    files = {"passwd": "etc/passwd", "group": "etc/group", "shadow": "etc/shadow"}
    if db not in files:
        io.err(f"getent: неизвестная база данных «{db}»")
        return 1
    if db == "shadow" and _need_root(ctx, io, "getent"):
        return 2
    text = _read(ctx, files[db], True) or ""
    keys = argv[2:]
    found = 0
    for line in text.splitlines():
        fields = line.split(":")
        if not line.strip() or line.startswith("#"):
            continue
        if not keys or fields[0] in keys or (db != "shadow" and len(fields) > 2 and fields[2] in keys):
            io.out(line + "\n")
            found += 1
    return 0 if found or not keys else 2


def _status_line(name, hash_):
    state = "L" if hash_.startswith("!") else "NP" if hash_ == "" else "P"
    return f"{name} {state} 2026-09-01 0 99999 7 -1"


def cmd_passwd(ctx, argv, io):
    parsed = parse_short_flags("passwd", argv, "luSa", io)
    if parsed is None:
        return 1
    flags, ops = parsed
    if not flags:
        io.err("passwd: смена пароля в учебном терминале недоступна. Блокировка: sudo passwd -l ИМЯ, "
               "состояние: sudo passwd -S ИМЯ")
        return 1
    if _need_root(ctx, io, "passwd", "passwd: недостаточно прав — блокировать и проверять чужие учётные записи "
                                     "может только root (sudo passwd ...)"):
        return 1
    users, _, shadow = _db(ctx)
    if "S" in flags:
        names = list(shadow) if "a" in flags else ops
        if not names:
            io.err("passwd: укажите имя пользователя: sudo passwd -S ИМЯ")
            return 1
        for name in names:
            if name not in shadow:
                io.err(f"passwd: пользователь «{name}» не существует")
                return 1
            io.out(_status_line(name, shadow[name]) + "\n")
        return 0
    if len(ops) != 1:
        io.err("passwd: укажите одно имя пользователя")
        return 1
    name = ops[0]
    if name not in users:
        io.err(f"passwd: пользователь «{name}» не существует")
        return 1
    res = accounts.set_shadow_lock(_read(ctx, "etc/shadow", True), name, "l" in flags)
    if res is None:
        io.err(f"passwd: пользователь «{name}» не найден в /etc/shadow")
        return 1
    text, changed = res
    if changed:
        _write(ctx, "etc/shadow", text)
    io.out("passwd: информация об истечении срока действия пароля изменена.\n")
    return 0


def _set_lock(ctx, io, cmd, name, lock):
    res = accounts.set_shadow_lock(_read(ctx, "etc/shadow", True), name, lock)
    if res is None:
        io.err(f"{cmd}: пользователь «{name}» не найден в /etc/shadow")
        return False
    if res[1]:
        _write(ctx, "etc/shadow", res[0])
    return True


def cmd_usermod(ctx, argv, io):
    parsed = parse_short_flags("usermod", argv, "LUa", io, with_value="Gs")
    if parsed is None:
        return 1
    flags, ops = parsed
    if len(ops) != 1 or not flags:
        io.err("Использование: usermod [-L|-U] [-a -G ГРУППЫ] [-G ГРУППЫ] [-s ОБОЛОЧКА] ИМЯ\n"
               "  -L — заблокировать, -U — разблокировать, -aG — добавить в группы, -s — сменить оболочку")
        return 2
    if _need_root(ctx, io, "usermod", "usermod: Permission denied. (нужны права root: sudo usermod ...)"):
        return 1
    name = ops[0]
    users, groups, _ = _db(ctx)
    if name not in users:
        io.err(f"usermod: пользователь «{name}» не существует")
        return 6
    if "a" in flags and "G" not in flags:
        io.err("usermod: ключ -a используется только вместе с -G (usermod -aG группа имя)")
        return 2
    if "L" in flags and "U" in flags:
        io.err("usermod: ключи -L и -U нельзя использовать вместе")
        return 2
    if "G" in flags:
        wanted = [g for g in flags["G"].split(",") if g]
        missing = [g for g in wanted if g not in groups]
        if missing:
            io.err(f"usermod: группа «{missing[0]}» не существует")
            return 6
        text = _read(ctx, "etc/group", True)
        names = set(wanted)
        if "a" not in flags:
            # без -a список дополнительных групп ЗАМЕНЯЕТСЯ: из остальных групп пользователь удаляется
            for g, info in groups.items():
                if name in info["members"] and g not in names:
                    text = accounts.set_group_member(text, g, name, False)[0]
        for g in wanted:
            text = accounts.set_group_member(text, g, name, True)[0]
        _write(ctx, "etc/group", text)
    if "s" in flags:
        res = accounts.set_passwd_field(_read(ctx, "etc/passwd", True), name, 6, flags["s"])
        if res and res[1]:
            _write(ctx, "etc/passwd", res[0])
    if "L" in flags and not _set_lock(ctx, io, "usermod", name, True):
        return 1
    if "U" in flags and not _set_lock(ctx, io, "usermod", name, False):
        return 1
    return 0


def _group_member(ctx, io, cmd, user, group, add):
    if _need_root(ctx, io, cmd, f"{cmd}: Permission denied. (нужны права root: sudo {cmd} ...)"):
        return 1
    users, groups, _ = _db(ctx)
    if user not in users:
        io.err(f"{cmd}: пользователь «{user}» не существует")
        return 3
    if group not in groups:
        io.err(f"{cmd}: группа «{group}» не существует")
        return 3
    text, changed = accounts.set_group_member(_read(ctx, "etc/group", True), group, user, add)
    if not changed:
        io.err(f"{cmd}: пользователь «{user}» {'уже' if add else 'не'} является членом «{group}»")
        return 3
    _write(ctx, "etc/group", text)
    io.out(f"{'Добавление' if add else 'Удаление'} пользователя {user} {'в группу' if add else 'из группы'} {group}\n")
    return 0


def cmd_gpasswd(ctx, argv, io):
    parsed = parse_short_flags("gpasswd", argv, "", io, with_value="ad")
    if parsed is None:
        return 2
    flags, ops = parsed
    if len(ops) != 1 or not ({"a", "d"} & set(flags)):
        io.err("Использование: gpasswd -a ПОЛЬЗОВАТЕЛЬ ГРУППА   — добавить в группу\n"
               "               gpasswd -d ПОЛЬЗОВАТЕЛЬ ГРУППА   — удалить из группы")
        return 2
    user = flags.get("a") or flags.get("d")
    return _group_member(ctx, io, "gpasswd", user, ops[0], "a" in flags)


def cmd_deluser(ctx, argv, io):
    ops = [a for a in argv[1:] if not a.startswith("-")]
    if len(ops) != 2:
        io.err("deluser: в учебном терминале поддерживается только удаление из группы: sudo deluser ИМЯ ГРУППА\n"
               "(удалять учётные записи целиком при расследовании нельзя — это уничтожает данные)")
        return 1
    return _group_member(ctx, io, "deluser", ops[0], ops[1], False)


# ============================================================ last, lastb ===

def _fmt(ts):
    return time.strftime("%a %b %e %H:%M", time.localtime(ts)).replace("  ", " ")


def _last(ctx, argv, io, cmd, rel):
    parsed = parse_short_flags(cmd, argv, "", io, with_value="n")
    if parsed is None:
        return 1
    flags, ops = parsed
    try:
        text, _ = ctx.sb.read_text(rel, ctx.priv)
    except FsError as e:
        io.err(f"{cmd}: невозможно открыть /{rel}: {e}" + (" (нужны права root: sudo lastb)" if cmd == "lastb" else ""))
        return 1
    records = []
    for line in text.splitlines():
        try:
            records.append(json.loads(line))
        except ValueError:
            continue
    begins = min((r["login"] for r in records), default=time.time())
    records.sort(key=lambda r: r["login"], reverse=True)
    if ops:
        records = [r for r in records if r.get("user") in ops]
    if "n" in flags:
        try:
            records = records[:int(flags["n"])]
        except ValueError:
            io.err(f"{cmd}: неверное число строк: {flags['n']}")
            return 1
    for r in records:
        if r.get("logout") is None:
            end = "still logged in"
        else:
            mins = int((r["logout"] - r["login"]) // 60)
            end = f"- {time.strftime('%H:%M', time.localtime(r['logout']))}  ({mins // 60:02d}:{mins % 60:02d})"
        io.out(f"{r['user']:<8} {r.get('tty', 'pts/0'):<12} {r.get('host', ''):<16} {_fmt(r['login'])} {end}\n")
    io.out(f"\n{posixpath.basename(rel)} begins {time.strftime('%a %b %e %H:%M:%S %Y', time.localtime(begins))}\n")
    return 0


def cmd_last(ctx, argv, io):
    return _last(ctx, argv, io, "last", "var/log/wtmp")


def cmd_lastb(ctx, argv, io):
    return _last(ctx, argv, io, "lastb", "var/log/btmp")


# ============================================================ контрольные суммы ===

def _sum(ctx, argv, io, cmd, algo):
    parsed = parse_short_flags(cmd, argv, "c", io)
    if parsed is None:
        return 1
    flags, ops = parsed
    if "c" in flags:
        status = 0
        for name in ops or ["-"]:
            text = ctx.read_input(cmd, name, io)
            if text is None:
                return 1
            for line in text.splitlines():
                parts = line.split(None, 1)
                if len(parts) != 2:
                    continue
                digest, fname = parts[0], parts[1].lstrip("*").strip()
                try:
                    data = ctx.sb.read_bytes(ctx.resolve(fname), ctx.priv)
                except FsError as e:
                    io.out(f"{fname}: НЕ ПРОЧИТАН ({e})\n")
                    status = 1
                    continue
                ok = hashlib.new(algo, data).hexdigest() == digest.lower()
                io.out(f"{fname}: {'ЦЕЛ' if ok else 'НЕ СОВПАДАЕТ'}\n")
                if not ok:
                    io.err(f"{cmd}: ПРЕДУПРЕЖДЕНИЕ: 1 вычисленная контрольная сумма НЕ совпала")
                    status = 1
        return status
    status = 0
    if not ops:
        io.out(f"{hashlib.new(algo, (io.stdin or '').encode()).hexdigest()}  -\n")
        return 0
    for name in ops:
        try:
            data = ctx.sb.read_bytes(ctx.resolve(name), ctx.priv)
        except FsError as e:
            io.err(f"{cmd}: {name}: {e}")
            status = 1
            continue
        io.out(f"{hashlib.new(algo, data).hexdigest()}  {name}\n")
    return status


def cmd_sha256sum(ctx, argv, io):
    return _sum(ctx, argv, io, "sha256sum", "sha256")


def cmd_md5sum(ctx, argv, io):
    return _sum(ctx, argv, io, "md5sum", "md5")


# =============================================================== служба SSH ===

UNITS = {"ssh": "ssh", "ssh.service": "ssh", "sshd": "ssh", "sshd.service": "ssh"}


def _root(ctx):
    return ctx.sb.root


def _journal(state, text):
    stamp = time.strftime("%b %d %H:%M:%S")
    state.setdefault("journal", []).append(f"{stamp} seclab {text}")
    state["journal"] = state["journal"][-40:]


def _auth_log(ctx, text):
    """sshd пишет в /var/log/auth.log (если он есть) — студент видит причину отказа через sudo tail."""
    p = os.path.join(str(_root(ctx)), "var/log/auth.log")
    if os.path.isfile(p) and not os.path.islink(p):
        with open(p, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%b %e %H:%M:%S')} seclab sshd[{os.getpid() % 30000 + 1000}]: {text}\n")


def _apply(ctx, io, state, action):
    """reload/restart/start: проверить конфигурацию и применить. -> код возврата."""
    ctx.wrote = True  # состояние службы меняется — проверить критические пункты задания
    eff, errors = sshd_sim.file_effective(_root(ctx))
    if errors:
        for e in errors:
            _journal(state, f"sshd[{state.get('pid', 612)}]: {e}")
        if action == "restart" or not state.get("active"):
            state["active"] = False
            state["failed"] = True
            _journal(state, "systemd[1]: ssh.service: Failed with result 'exit-code'.")
            _journal(state, "systemd[1]: Failed to start ssh.service - OpenBSD Secure Shell server.")
        else:
            _journal(state, "systemd[1]: ssh.service: Control process exited, code=exited, status=255/EXCEPTION")
            _journal(state, "systemd[1]: Reload failed for ssh.service - OpenBSD Secure Shell server.")
        sshd_sim.save_state(_root(ctx), state)
        io.err(f"Job for ssh.service failed because the control process exited with error code.\n"
               "See \"systemctl status ssh.service\" and \"journalctl -xeu ssh.service\" for details.")
        return 1
    if action != "reload" or not state.get("active"):
        state["pid"] = 600 + secrets.randbelow(3000)
        state["since"] = time.time()
    state.update({"active": True, "failed": False, "settings": eff, "loaded_at": time.time()})
    verb = {"reload": "Reloaded", "restart": "Started", "start": "Started"}[action]
    if action == "reload":
        _journal(state, f"sshd[{state['pid']}]: Received SIGHUP; restarting.")
    _journal(state, f"sshd[{state['pid']}]: Server listening on 0.0.0.0 port {eff['port']}.")
    _journal(state, f"systemd[1]: {verb} ssh.service - OpenBSD Secure Shell server.")
    sshd_sim.save_state(_root(ctx), state)
    return 0


def cmd_systemctl(ctx, argv, io):
    args = [a for a in argv[1:] if not a.startswith("-")]
    if not args:
        io.err("systemctl: укажите действие: systemctl status|reload|restart|start|stop|is-active ssh")
        return 1
    action, units = args[0], args[1:]
    if action in ("daemon-reload",):
        return 0 if not _need_root(ctx, io, "systemctl") else 1
    if action == "list-units":
        state = sshd_sim.load_state(_root(ctx))
        io.out("  UNIT            LOAD   ACTIVE SUB     DESCRIPTION\n")
        if state:
            sub = "running" if state.get("active") else "failed" if state.get("failed") else "dead"
            act = "active" if state.get("active") else "failed" if state.get("failed") else "inactive"
            io.out(f"  ssh.service     loaded {act:<6} {sub:<7} OpenBSD Secure Shell server\n")
        io.out("  cron.service    loaded active running Regular background program processing daemon\n"
               "  rsyslog.service loaded active running System Logging Service\n")
        return 0
    if action not in ("status", "reload", "restart", "start", "stop", "is-active", "is-enabled", "enable", "disable"):
        io.err(f"systemctl: неизвестное действие «{action}» (в учебном терминале: status, reload, restart, start, "
               "stop, is-active)")
        return 1
    if not units:
        io.err(f"systemctl: укажите службу: systemctl {action} ssh")
        return 1
    unit = units[0]
    state = sshd_sim.load_state(_root(ctx))
    if UNITS.get(unit) != "ssh" or state is None:
        name = unit if "." in unit else unit + ".service"
        if action in ("is-active",):
            io.out("inactive\n")
            return 3
        io.err(f"Unit {name} could not be found.")
        return 4
    if action == "is-active":
        io.out(("active" if state.get("active") else "failed" if state.get("failed") else "inactive") + "\n")
        return 0 if state.get("active") else 3
    if action == "is-enabled":
        io.out("enabled\n")
        return 0
    if action == "status":
        return _status(state, io)
    if not ctx.priv:
        io.err(f"Failed to {action} ssh.service: Interactive authentication required.\n"
               "See system logs and 'systemctl status ssh.service' for details.\n"
               f"(управлять службами может только root: sudo systemctl {action} ssh)")
        return 1
    if action in ("enable", "disable"):
        return 0
    if action == "stop":
        ctx.wrote = True
        state["active"] = False
        state["failed"] = False
        _journal(state, "systemd[1]: Stopped ssh.service - OpenBSD Secure Shell server.")
        sshd_sim.save_state(_root(ctx), state)
        return 0
    if action == "reload" and not state.get("active"):
        io.err("ssh.service is not active, cannot reload.")
        return 1
    return _apply(ctx, io, state, action)


def _status(state, io):
    if state.get("active"):
        since = time.strftime("%a %Y-%m-%d %H:%M:%S %Z", time.localtime(state.get("since", time.time())))
        active = f"active (running) since {since}"
    elif state.get("failed"):
        active = "failed (Result: exit-code)"
    else:
        active = "inactive (dead)"
    dot = "●" if state.get("active") else "×" if state.get("failed") else "○"
    io.out(f"{dot} ssh.service - OpenBSD Secure Shell server\n"
           "     Loaded: loaded (/lib/systemd/system/ssh.service; enabled; preset: enabled)\n"
           f"     Active: {active}\n"
           "       Docs: man:sshd(8)\n"
           "             man:sshd_config(5)\n")
    if state.get("active"):
        port = (state.get("settings") or {}).get("port", "22")
        io.out(f"   Main PID: {state.get('pid', 612)} (sshd)\n"
               f"     CGroup: /system.slice/ssh.service\n"
               f"             └─{state.get('pid', 612)} \"sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups\"\n"
               f"     Listen: 0.0.0.0:{port} (TCP)\n")
    journal = state.get("journal", [])[-8:]
    if journal:
        io.out("\n" + "\n".join(journal) + "\n")
    return 0 if state.get("active") else 3


def cmd_journalctl(ctx, argv, io):
    if "--verify" in argv:
        import cmd_logs
        return cmd_logs.journal_verify(ctx, argv, io)
    parsed = parse_short_flags("journalctl", argv, "xe", io, with_value="un")
    if parsed is None:
        return 1
    flags, _ = parsed
    unit = flags.get("u")
    state = sshd_sim.load_state(_root(ctx))
    if not unit or UNITS.get(unit) != "ssh" or state is None:
        io.err("journalctl: в учебном терминале доступен только журнал службы SSH: journalctl -u ssh")
        return 1
    lines = state.get("journal", [])
    n = flags.get("n")
    if n:
        try:
            lines = lines[-int(n):]
        except ValueError:
            pass
    io.out("\n".join(lines) + ("\n" if lines else "-- No entries --\n"))
    return 0


def cmd_sshd(ctx, argv, io):
    parsed = parse_short_flags("sshd", argv, "tTD", io, with_value="f")
    if parsed is None:
        return 1
    flags, _ = parsed
    if not ({"t", "T"} & set(flags)):
        io.err("sshd: служба уже запущена через systemd. Проверка конфигурации: sudo sshd -t, "
               "действующие значения: sudo sshd -T, применить: sudo systemctl reload ssh")
        return 1
    if not ctx.priv:
        io.err("sshd: no hostkeys available -- exiting.\n(проверка конфигурации читает ключи сервера — нужен root: sudo sshd -t)")
        return 1
    if "f" in flags:
        io.err("sshd: в учебном терминале проверяется только /etc/ssh/sshd_config (без -f)")
        return 1
    settings, _, errors = sshd_sim.parse(_root(ctx))
    if errors:
        for e in errors:
            io.err(e)
        io.err(f"/{sshd_sim.CONFIG}: terminating, {len(errors)} bad configuration options")
        return 255
    if "T" in flags:
        io.out(sshd_sim.dump(sshd_sim.effective(settings)))
    return 0


def _home_of(ctx, user):
    users = accounts.parse_passwd(_read(ctx, "etc/passwd", True))
    if user in users:
        return users[user]["home"].lstrip("/")
    return "root" if user == "root" else f"home/{user}"


def _client_keys(ctx, io, identities):
    """Открытые ключи, которые предъявит клиент: -i ФАЙЛ или ~/.ssh/id_ed25519, id_rsa."""
    keys = []
    explicit = bool(identities)
    if not explicit:
        home = _home_of(ctx, _me(ctx))
        identities = [f"/{home}/.ssh/id_ed25519", f"/{home}/.ssh/id_rsa"]
    for path in identities:
        try:
            vrel = ctx.resolve(path)
        except FsError:
            continue
        if not ctx.sb.isfile(vrel):
            if explicit:
                io.err(f"Warning: Identity file {path} not accessible: No such file or directory.")
            continue
        try:
            text, _ = ctx.sb.read_text(vrel, ctx.priv)
        except FsError:
            if explicit:
                io.err(f"Load key \"{path}\": Permission denied")
            continue
        mode = os.stat(ctx.sb.path(vrel)).st_mode & 0o777
        if mode & 0o077:
            io.err("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n"
                   "@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @\n"
                   "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n"
                   f"Permissions 0{mode:o} for '{path}' are too open.\n"
                   "It is required that your private key files are NOT accessible by others.\n"
                   f"This private key will be ignored. (исправьте: chmod 600 {path})")
            continue
        if "PRIVATE KEY" not in text:
            if explicit:
                io.err(f"Load key \"{path}\": invalid format (нужен ЗАКРЫТЫЙ ключ — файл без .pub)")
            continue
        pub = sshd_sim.derive_pub(text)
        if pub:
            keys.append(pub)
    return keys


LOCAL_HOSTS = ("localhost", "127.0.0.1", "::1", "seclab", "seclab.local")


def cmd_ssh(ctx, argv, io):
    parsed = parse_short_flags("ssh", argv, "vNTqC", io, with_value="iplo")
    if parsed is None:
        return 255
    # -i и -o могут повторяться — соберём все значения
    identities, options = [], {}
    args = argv[1:]
    for n, a in enumerate(args):
        value = None
        if a in ("-i", "-o") and n + 1 < len(args):
            value = args[n + 1]
        elif a[:2] in ("-i", "-o") and len(a) > 2:
            value = a[2:]
        if value is None:
            continue
        if a.startswith("-i"):
            identities.append(value)
        else:
            key, _, val = value.partition("=")
            options[key.strip()] = val.strip()
    flags, ops = parsed
    if not ops:
        io.err("usage: ssh [-i файл_ключа] [-p порт] [-o Параметр=значение] [пользователь@]сервер")
        return 255
    target = ops[0]
    user, _, host = target.rpartition("@")
    user = flags.get("l") or user or _me(ctx)
    port = flags.get("p") or options.get("Port") or "22"
    opts = {k.lower(): v.lower() for k, v in options.items()}
    try_pubkey = opts.get("pubkeyauthentication", "yes") != "no"
    try_password = opts.get("passwordauthentication", "yes") != "no" and opts.get("batchmode", "no") != "yes"
    if "preferredauthentications" in opts:
        pref = opts["preferredauthentications"].split(",")
        try_pubkey = try_pubkey and "publickey" in pref
        try_password = try_password and ("password" in pref or "keyboard-interactive" in pref)

    def record(ok, method):
        for entry in reversed(ctx.trace):
            if entry["argv"] and posixpath.basename(entry["argv"][0]) == "ssh":
                entry["ssh"] = {"user": user, "ok": ok, "method": method, "port": str(port)}
                break

    if host not in LOCAL_HOSTS:
        record(False, None)
        io.err(f"ssh: connect to host {host} port {port}: Connection timed out\n"
               "(в учебном терминале можно подключаться только к этому серверу: localhost)")
        return 255
    state = sshd_sim.load_state(_root(ctx))
    eff = sshd_sim.running(_root(ctx))
    if eff is None or str(eff.get("port")) != str(port):
        record(False, None)
        io.err(f"ssh: connect to host {host} port {port}: Connection refused")
        if state is None:
            io.err("(на этом учебном сервере служба SSH не установлена)")
        return 255
    keys = _client_keys(ctx, io, identities) if try_pubkey else []
    ok, method, reason = sshd_sim.login(_root(ctx), eff, user, keys, try_pubkey, try_password)
    rport = 40000 + secrets.randbelow(20000)
    if ok and method == "password" and keys:
        why = sshd_sim.pubkey_refusal(_root(ctx), eff, user, keys)
        if why:
            _auth_log(ctx, why)
    if ok:
        detail = ""
        if method == "publickey":
            detail = f": ED25519 {sshd_sim.fingerprint(keys[0]) if keys else ''}"
        _auth_log(ctx, f"Accepted {method} for {user} from 127.0.0.1 port {rport} ssh2{detail}")
        if method == "password":
            if keys:
                io.err("(ключ сервер не принял, поэтому вход выполнен по паролю — "
                       "причина отказа: sudo tail -n 3 /var/log/auth.log)")
            io.out(f"{user}@{host}'s password: ********   (учебный эмулятор вводит пароль сам)\n")
        io.out(f"Linux seclab 6.1.0-26-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.112-1 x86_64\n"
               f"Вход выполнен: {user}@seclab (способ входа: {'ключ' if method == 'publickey' else 'пароль'}).\n"
               "[учебный эмулятор: удалённый сеанс сразу завершается]\n"
               f"Connection to {host} closed.\n")
        record(True, method)
        return 0
    _auth_log(ctx, reason + f" from 127.0.0.1 port {rport}")
    users = accounts.parse_passwd(_read(ctx, "etc/passwd", True))
    is_root = users.get(user, {}).get("uid") == 0
    io.err(f"{user}@{host}: Permission denied ({sshd_sim.server_methods(eff, is_root)}).")
    record(False, None)
    return 255


def cmd_ssh_keygen(ctx, argv, io):
    parsed = parse_short_flags("ssh-keygen", argv, "lyq", io, with_value="ftNC")
    if parsed is None:
        return 1
    flags, _ = parsed
    if "l" in flags or "y" in flags:
        path = flags.get("f")
        if not path:
            io.err("ssh-keygen: укажите файл ключа: ssh-keygen -l -f ~/.ssh/id_ed25519.pub")
            return 1
        text = ctx.read_input("ssh-keygen", path, io)
        if text is None:
            return 1
        if "y" in flags:
            if "PRIVATE KEY" not in text:
                io.err(f"Load key \"{path}\": invalid format")
                return 1
            io.out(sshd_sim.derive_pub(text) + "\n")
            return 0
        pub = text if "PRIVATE KEY" not in text else sshd_sim.derive_pub(text)
        fp = sshd_sim.fingerprint(pub.splitlines()[0] if pub else "")
        if not fp:
            io.err(f"{path} is not a public key file.")
            return 1
        comment = " ".join(pub.splitlines()[0].split()[2:]) or "no comment"
        io.out(f"256 {fp} {comment} (ED25519)\n")
        return 0
    if flags.get("t", "ed25519") != "ed25519":
        io.err("ssh-keygen: в учебном терминале поддерживаются только ключи ed25519 (-t ed25519)")
        return 1
    home = _home_of(ctx, _me(ctx))
    path = flags.get("f") or f"/{home}/.ssh/id_ed25519"
    vrel = ctx.resolve(path)
    if ctx.sb.lexists(vrel):
        io.err(f"{path} already exists. (ключ уже есть — новый не нужен; удалите старый, если действительно нужно)")
        return 1
    body = secrets.token_urlsafe(48)
    private = f"-----BEGIN OPENSSH PRIVATE KEY-----\n{body}\n-----END OPENSSH PRIVATE KEY-----\n"
    comment = flags.get("C") or f"{_me(ctx)}@seclab"
    ctx.sb.write_text(vrel, private, ctx.priv)
    os.chmod(ctx.sb.path(vrel), 0o600)
    ctx.sb.write_text(ctx.resolve(path + ".pub"), sshd_sim.derive_pub(private, comment) + "\n", ctx.priv)
    ctx.wrote = True
    io.out(f"Generating public/private ed25519 key pair.\nYour identification has been saved in {path}\n"
           f"Your public key has been saved in {path}.pub\n"
           f"The key fingerprint is:\n{sshd_sim.fingerprint(sshd_sim.derive_pub(private))} {comment}\n")
    return 0
