"""
Команды ps и ss учебного терминала (задание №11 «procs»). Данные берутся из модели процессов и
сокетов песочницы (proc_model.py). Поддерживается подмножество, нужное для расследования:

  ps aux [--sort=-%cpu|-%mem]        — список процессов с пользователем и нагрузкой
  ps -p PID[,PID] -o поле,поле[=]    — выбранные процессы и поля (pid,ppid,user,lstart,etime,cmd,args…)
  ps [-e|-ef]                        — все процессы (без -o — pid tty time cmd)
  ss -lntup                          — слушающие TCP/UDP-сокеты с процессом
  ss -tnp                            — установленные TCP-соединения с процессом

/proc/<PID>/{exe,cmdline} — настоящие файлы песочницы, их читают readlink/cat/ls.
"""

import proc_model
from vfs import FsError


def _pids(spec):
    out = []
    for part in str(spec).replace(",", " ").split():
        try:
            out.append(int(part))
        except ValueError:
            pass
    return out


def cmd_ps(ctx, argv, io):
    procs = proc_model.load(ctx.sb.root)["procs"]
    args = argv[1:]
    aux = False
    sort = None
    pids = None
    fields = None
    i = 0
    while i < len(args):
        a = args[i]
        if a.startswith("--sort="):
            sort = a.split("=", 1)[1]
        elif a == "--sort" and i + 1 < len(args):
            i += 1
            sort = args[i]
        elif a in ("-p", "-q", "--pid", "-C") and i + 1 < len(args):
            i += 1
            pids = (pids or []) + _pids(args[i])
        elif a.startswith("-p") and len(a) > 2:
            pids = (pids or []) + _pids(a[2:])
        elif a in ("-o", "--format") and i + 1 < len(args):
            i += 1
            fields = (fields or []) + args[i].split(",")
        elif a.startswith("-o") and len(a) > 2:
            fields = (fields or []) + a[2:].split(",")
        elif a.lstrip("-") and all(c in "auxefA" for c in a.lstrip("-")):
            aux = True
        i += 1

    if fields is not None:
        io.out(proc_model.format_select(procs, pids, fields))
        return 0
    if pids is not None:
        io.out(proc_model.format_select(procs, pids, ["pid", "tty", "time", "cmd"]))
        return 0
    if aux:
        io.out(proc_model.format_aux(procs, sort))
        return 0
    # Голый ps — как в системе: краткий список.
    io.out(proc_model.format_select(procs, None, ["pid", "tty", "time", "cmd"]))
    return 0


def cmd_ss(ctx, argv, io):
    sockets = proc_model.load(ctx.sb.root)["sockets"]
    flags = set()
    for a in argv[1:]:
        if a.startswith("-") and len(a) > 1 and not a.startswith("--"):
            flags.update(a[1:])
    protos = []
    if "t" in flags:
        protos.append("tcp")
    if "u" in flags:
        protos.append("udp")
    if not protos:
        protos = ["tcp", "udp"]
    io.out(proc_model.format_ss(
        sockets,
        listening="l" in flags,
        all_states="a" in flags,
        protos=tuple(protos),
        show_proc="p" in flags,
    ))
    return 0


def cmd_crontab(ctx, argv, io):
    """crontab -l [-u ИМЯ] — показать задания cron пользователя (var/spool/cron/crontabs/<user>)."""
    user = ctx.sb.user
    show = False
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "-l":
            show = True
        elif a == "-u" and i + 1 < len(argv):
            i += 1
            user = argv[i]
        elif a.startswith("-u") and len(a) > 2:
            user = a[2:]
        i += 1
    if not show:
        io.err("crontab: в учебном терминале поддерживается только просмотр: crontab -l [-u ИМЯ]")
        return 1
    if user != ctx.sb.user and not ctx.priv:
        io.err(f"crontab: пользователь {ctx.sb.user} не может использовать -u (нужен sudo: sudo crontab -l -u {user})")
        return 1
    try:
        text, _ = ctx.sb.read_text(f"var/spool/cron/crontabs/{user}", ctx.priv)
    except FsError:
        text = None
    if text is None:
        io.out(f"no crontab for {user}\n")
        return 1
    io.out(text if text.endswith("\n") else text + "\n")
    return 0
