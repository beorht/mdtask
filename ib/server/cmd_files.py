"""
Команды работы с файлами и каталогами для эмулятора терминала:
mkdir, rmdir, rm, mv, cp, chmod, ln, readlink, file, basename, dirname, tree.

Поведение и сообщения — как у GNU coreutils (по-русски). Все операции идут через
vfs.Sandbox: пути проверяются, права (владелец, rwx, sudo) эмулируются.
"""

import os
import posixpath
import re
import stat as st

import vfs
from vfs import FsError

UMASK = 0o022

LONG = {
    "--recursive": "r", "--force": "f", "--verbose": "v", "--parents": "p", "--interactive": "i",
    "--no-clobber": "n", "--symbolic": "s", "--dir": "d", "--archive": "a", "--preserve": "p",
    "--changes": "c", "--silent": "f", "--quiet": "f", "--no-dereference": "n", "--canonicalize": "f",
    "--canonicalize-existing": "e", "--canonicalize-missing": "m", "--ignore-fail-on-non-empty": "I",
}


def parse_opts(cmd, argv, allowed, io, with_value="", longs=None):
    """Короткие (-rf, -m 755, -m755) и длинные (--recursive) ключи.
    -> (флаги, операнды) или None (сообщение уже выведено)."""
    longs = LONG if longs is None else longs
    flags, operands = {}, []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--":
            operands.extend(argv[i + 1:])
            break
        if a.startswith("--"):
            name, _, value = a.partition("=")
            key = longs.get(name)
            if key is None or key not in allowed + with_value:
                io.err(f"{cmd}: нераспознанный ключ «{a}»\nПо команде «man {cmd}» можно получить справку.")
                return None
            if key in with_value:
                if not value:
                    i += 1
                    if i >= len(argv):
                        io.err(f"{cmd}: ключ «{name}» требует аргумент")
                        return None
                    value = argv[i]
                flags[key] = value
            else:
                flags[key] = True
        elif a.startswith("-") and len(a) > 1:
            j = 1
            while j < len(a):
                ch = a[j]
                if ch in with_value:
                    value = a[j + 1:]
                    if not value:
                        i += 1
                        if i >= len(argv):
                            io.err(f"{cmd}: ключ требует аргумент -- «{ch}»")
                            return None
                        value = argv[i]
                    flags[ch] = value
                    break
                if ch not in allowed:
                    io.err(f"{cmd}: неверный ключ — «{ch}»\nПо команде «man {cmd}» можно получить справку.")
                    return None
                flags[ch] = True
                j += 1
        else:
            operands.append(a)
        i += 1
    return flags, operands


def _is_real_dir(sb, vrel):
    return sb.isdir(vrel) and not sb.islink(vrel)


def _join(vrel, name):
    return f"{vrel}/{name}" if vrel else name


def _shown_join(shown, name):
    return shown + name if shown.endswith("/") else f"{shown}/{name}"


# ================================================================ mkdir ===

def cmd_mkdir(ctx, argv, io):
    parsed = parse_opts("mkdir", argv, "pv", io, with_value="m", longs={**LONG, "--mode": "m"})
    if parsed is None:
        return 1
    flags, operands = parsed
    if not operands:
        io.err("mkdir: пропущен операнд\nПо команде «man mkdir» можно получить справку.")
        return 1
    mode = 0o755
    if "m" in flags:
        mode = apply_mode(flags["m"], 0o777 & ~UMASK, True)
        if mode is None:
            io.err(f"mkdir: неверный режим доступа «{flags['m']}»")
            return 1
    status = 0
    for name in operands:
        try:
            vrel = ctx.resolve(name)
        except FsError as e:
            io.err(f"mkdir: невозможно создать каталог '{name}': {e}")
            status = 1
            continue
        if "p" in flags:
            parts = [p for p in vrel.split("/") if p]
            cur = ""
            for k, piece in enumerate(parts):
                cur = _join(cur, piece)
                if ctx.sb.lexists(cur):
                    if not ctx.sb.isdir(cur):
                        io.err(f"mkdir: невозможно создать каталог '{name}': {vfs.ENOTDIR}")
                        status = 1
                        break
                    continue
                try:
                    ctx.sb.mkdir(cur, ctx.priv, mode if k == len(parts) - 1 else 0o755)
                    ctx.wrote = True
                    if "v" in flags:
                        io.out(f"mkdir: создан каталог '{ctx.sb.display(cur)}'\n")
                except FsError as e:
                    io.err(f"mkdir: невозможно создать каталог '{name}': {e}")
                    status = 1
                    break
            continue
        try:
            ctx.sb.mkdir(vrel, ctx.priv, mode)
            ctx.wrote = True
            if "v" in flags:
                io.out(f"mkdir: создан каталог '{name}'\n")
        except FsError as e:
            io.err(f"mkdir: невозможно создать каталог '{name}': {e}")
            status = 1
    return status


# ================================================================ rmdir ===

def cmd_rmdir(ctx, argv, io):
    parsed = parse_opts("rmdir", argv, "pvI", io)
    if parsed is None:
        return 1
    flags, operands = parsed
    if not operands:
        io.err("rmdir: пропущен операнд")
        return 1
    status = 0
    for name in operands:
        targets = [name]
        if "p" in flags:
            path = name.rstrip("/")
            while "/" in path.strip("/"):
                path = posixpath.dirname(path)
                targets.append(path)
        for shown in targets:
            try:
                vrel = ctx.resolve(shown)
                ctx.sb.rmdir(vrel, ctx.priv)
                ctx.wrote = True
                if "v" in flags:
                    io.out(f"rmdir: удаление каталога '{shown}'\n")
            except FsError as e:
                if not ("I" in flags and str(e) == vfs.ENOTEMPTY):
                    io.err(f"rmdir: не удалось удалить '{shown}': {e}")
                    status = 1
                break
    return status


# =================================================================== rm ===

def cmd_rm(ctx, argv, io):
    parsed = parse_opts("rm", argv, "rRfvidI", io, longs={**LONG, "--no-preserve-root": "P", "--preserve-root": "Q"})
    if parsed is None:
        return 1
    flags, operands = parsed
    recursive = "r" in flags or "R" in flags
    if "i" in flags or "I" in flags:
        io.err("rm: интерактивный режим (-i) в учебном терминале не поддерживается — ничего не удалено")
        return 1
    if not operands:
        if "f" in flags:
            return 0
        io.err("rm: пропущен операнд\nПо команде «man rm» можно получить справку.")
        return 1
    status = 0
    sb = ctx.sb

    def remove_tree(vrel, shown):
        ok = True
        try:
            names = sb.listdir(vrel, ctx.priv)
        except FsError as e:
            io.err(f"rm: невозможно удалить '{shown}': {e}")
            return False
        for child in names:
            cv, cs = _join(vrel, child), _shown_join(shown, child)
            if _is_real_dir(sb, cv):
                ok = remove_tree(cv, cs) and ok
            else:
                try:
                    sb.unlink(cv, ctx.priv)
                    ctx.wrote = True
                    if "v" in flags:
                        io.out(f"удалён '{cs}'\n")
                except FsError as e:
                    io.err(f"rm: невозможно удалить '{cs}': {e}")
                    ok = False
        if not ok:
            return False
        try:
            sb.rmdir(vrel, ctx.priv)
            ctx.wrote = True
            if "v" in flags:
                io.out(f"удалён каталог '{shown}'\n")
        except FsError as e:
            io.err(f"rm: невозможно удалить '{shown}': {e}")
            return False
        return True

    for name in operands:
        try:
            vrel = ctx.resolve(name)
        except FsError as e:
            io.err(f"rm: невозможно удалить '{name}': {e}")
            status = 1
            continue
        if vrel == "" and recursive:
            io.err("rm: опасно рекурсивно обрабатывать '/'\nrm: используйте --no-preserve-root, чтобы отключить эту защиту "
                   "(в учебном терминале она не отключается)")
            status = 1
            continue
        if posixpath.basename(name.rstrip("/")) in (".", ".."):
            io.err(f"rm: удаление каталогов '.' или '..' запрещено: пропускается '{name}'")
            status = 1
            continue
        if not sb.lexists(vrel):
            if "f" not in flags:
                io.err(f"rm: невозможно удалить '{name}': {vfs.ENOENT}")
                status = 1
            continue
        if sb.protected(vrel):
            io.err(f"rm: невозможно удалить '{name}': {vfs.PROTECTED}")
            status = 1
            continue
        if _is_real_dir(sb, vrel):
            if recursive:
                if not remove_tree(vrel, name):
                    status = 1
                continue
            if "d" in flags:
                try:
                    sb.rmdir(vrel, ctx.priv)
                    ctx.wrote = True
                    if "v" in flags:
                        io.out(f"удалён каталог '{name}'\n")
                except FsError as e:
                    io.err(f"rm: невозможно удалить '{name}': {e}")
                    status = 1
                continue
            io.err(f"rm: невозможно удалить '{name}': {vfs.EISDIR}")
            status = 1
            continue
        try:
            sb.unlink(vrel, ctx.priv)
            ctx.wrote = True
            if "v" in flags:
                io.out(f"удалён '{name}'\n")
        except FsError as e:
            io.err(f"rm: невозможно удалить '{name}': {e}")
            status = 1
    return status


# =================================================================== mv ===

def _targets(ctx, cmd, operands, flags, io):
    """Общая часть cp/mv/ln: [(источник, vrel источника, vrel цели, показ цели)] или None."""
    if "t" in flags:
        dest, sources = flags["t"], operands
    else:
        if len(operands) < 2:
            if not operands:
                io.err(f"{cmd}: пропущен операнд, задающий файл")
            else:
                io.err(f"{cmd}: после '{operands[0]}' пропущен операнд, задающий целевой файл")
            return None
        *sources, dest = operands
    try:
        dest_vrel = ctx.resolve(dest)
    except FsError as e:
        io.err(f"{cmd}: '{dest}': {e}")
        return None
    dest_is_dir = ctx.sb.isdir(dest_vrel)
    if (len(sources) > 1 or "t" in flags) and not dest_is_dir:
        io.err(f"{cmd}: указанная цель '{dest}' не является каталогом")
        return None
    res = []
    for src in sources:
        try:
            src_vrel = ctx.resolve(src)
        except FsError as e:
            io.err(f"{cmd}: '{src}': {e}")
            res.append((src, None, None, None))
            continue
        if dest_is_dir:
            base = posixpath.basename(src.rstrip("/")) or posixpath.basename(src_vrel)
            res.append((src, src_vrel, _join(dest_vrel, base), _shown_join(dest, base)))
        else:
            res.append((src, src_vrel, dest_vrel, dest))
    return res


def cmd_mv(ctx, argv, io):
    parsed = parse_opts("mv", argv, "fivnTu", io, with_value="t", longs={**LONG, "--target-directory": "t"})
    if parsed is None:
        return 1
    flags, operands = parsed
    items = _targets(ctx, "mv", operands, flags, io)
    if items is None:
        return 1
    status = 0
    for src, src_vrel, dst_vrel, dst_shown in items:
        if src_vrel is None:
            status = 1
            continue
        sb = ctx.sb
        if not sb.lexists(src_vrel):
            io.err(f"mv: не удалось выполнить stat для '{src}': {vfs.ENOENT}")
            status = 1
            continue
        if dst_vrel == src_vrel:
            io.err(f"mv: '{src}' и '{dst_shown}' — один и тот же файл")
            status = 1
            continue
        if sb.lexists(dst_vrel) and ("n" in flags or "i" in flags):
            if "i" in flags:
                io.err(f"mv: '{dst_shown}' существует — интерактивный режим (-i) не поддерживается, файл не перезаписан")
                status = 1
            continue
        try:
            sb.rename(src_vrel, dst_vrel, ctx.priv)
            ctx.wrote = True
            if "v" in flags:
                io.out(f"переименовано '{src}' -> '{dst_shown}'\n")
        except FsError as e:
            if str(e).startswith("невозможно переместить"):
                io.err(f"mv: невозможно переместить '{src}' в подкаталог самого себя, '{dst_shown}'")
            else:
                io.err(f"mv: невозможно переместить '{src}' в '{dst_shown}': {e}")
            status = 1
    return status


# =================================================================== cp ===

def cmd_cp(ctx, argv, io):
    parsed = parse_opts("cp", argv, "rRaipfvnLPdTu", io, with_value="t", longs={**LONG, "--target-directory": "t"})
    if parsed is None:
        return 1
    flags, operands = parsed
    recursive = "r" in flags or "R" in flags or "a" in flags
    keep_mode = "p" in flags or "a" in flags
    items = _targets(ctx, "cp", operands, flags, io)
    if items is None:
        return 1
    sb = ctx.sb
    status = 0

    def copy_file(src_vrel, dst_vrel, src_shown, dst_shown):
        if sb.lexists(dst_vrel) and ("n" in flags or "i" in flags):
            if "i" in flags:
                io.err(f"cp: '{dst_shown}' существует — интерактивный режим (-i) не поддерживается, файл не перезаписан")
            return "i" not in flags
        if sb.lexists(dst_vrel) and sb.real(dst_vrel) == sb.real(src_vrel):
            io.err(f"cp: '{src_shown}' и '{dst_shown}' — один и тот же файл")
            return False
        try:
            data = sb.read_bytes(src_vrel, ctx.priv)
            existed = sb.lexists(dst_vrel)
            if existed and _is_real_dir(sb, dst_vrel):
                raise FsError(vfs.EISDIR)
            sb.write_bytes(dst_vrel, data, ctx.priv)
            ctx.wrote = True
            if not existed:
                mode = st.S_IMODE(sb.stat(src_vrel).st_mode)
                os.chmod(sb.path(dst_vrel), mode if keep_mode else mode & ~UMASK & 0o777)
            if "v" in flags:
                io.out(f"'{src_shown}' -> '{dst_shown}'\n")
            return True
        except FsError as e:
            io.err(f"cp: невозможно скопировать '{src_shown}' в '{dst_shown}': {e}")
            return False

    def copy_tree(src_vrel, dst_vrel, src_shown, dst_shown):
        ok = True
        if not sb.lexists(dst_vrel):
            try:
                sb.mkdir(dst_vrel, ctx.priv, st.S_IMODE(sb.stat(src_vrel).st_mode) if keep_mode else 0o755)
                ctx.wrote = True
                if "v" in flags:
                    io.out(f"'{src_shown}' -> '{dst_shown}'\n")
            except FsError as e:
                io.err(f"cp: невозможно создать каталог '{dst_shown}': {e}")
                return False
        elif not sb.isdir(dst_vrel):
            io.err(f"cp: невозможно перезаписать не-каталог '{dst_shown}' каталогом '{src_shown}'")
            return False
        try:
            names = sb.listdir(src_vrel, ctx.priv)
        except FsError as e:
            io.err(f"cp: невозможно открыть каталог '{src_shown}': {e}")
            return False
        for child in names:
            cs, cd = _join(src_vrel, child), _join(dst_vrel, child)
            ss, ds = _shown_join(src_shown, child), _shown_join(dst_shown, child)
            if sb.islink(cs) and "L" not in flags:
                try:
                    sb.check_dir_write(dst_vrel, ctx.priv)
                    if sb.lexists(cd):
                        sb.unlink(cd, ctx.priv)
                    sb._count_new()
                    os.symlink(os.readlink(sb.path(cs)), sb.path(cd))
                    ctx.wrote = True
                except FsError as e:
                    io.err(f"cp: невозможно создать ссылку '{ds}': {e}")
                    ok = False
            elif sb.isdir(cs):
                ok = copy_tree(cs, cd, ss, ds) and ok
            else:
                ok = copy_file(cs, cd, ss, ds) and ok
        return ok

    for src, src_vrel, dst_vrel, dst_shown in items:
        if src_vrel is None:
            status = 1
            continue
        if not sb.lexists(src_vrel) or not sb.exists(src_vrel):
            io.err(f"cp: не удалось выполнить stat для '{src}': {vfs.ENOENT}")
            status = 1
            continue
        if sb.isdir(src_vrel):
            if not recursive:
                io.err(f"cp: не указан -r; пропускается каталог '{src}'")
                status = 1
                continue
            real_src = sb.real_vrel(src_vrel)
            if dst_vrel == real_src or dst_vrel.startswith(real_src + "/"):
                io.err(f"cp: невозможно скопировать каталог '{src}' в самого себя, '{dst_shown}'")
                status = 1
                continue
            if not copy_tree(src_vrel, dst_vrel, src, dst_shown):
                status = 1
            continue
        if not copy_file(src_vrel, dst_vrel, src, dst_shown):
            status = 1
    return status


# ================================================================ chmod ===

CLASS_SHIFT = {"u": 6, "g": 3, "o": 0}


def apply_mode(spec, current, is_dir):
    """Режим chmod (755, u+x, go-w, a=r, u=rwx,g=rx,o=) -> новые права или None при ошибке."""
    if re.fullmatch(r"[0-7]{1,4}", spec):
        return int(spec, 8)
    mode = current
    for clause in spec.split(","):
        m = re.fullmatch(r"([ugoa]*)((?:[-+=][rwxXstugo]*)+)", clause)
        if not m:
            return None
        who = m.group(1).replace("a", "ugo")
        masked = who == ""
        classes = who or "ugo"
        for op, perms in re.findall(r"([-+=])([rwxXstugo]*)", m.group(2)):
            bits = 0
            for cls in classes:
                shift = CLASS_SHIFT[cls]
                b = 0
                for p in perms:
                    if p == "r":
                        b |= 4
                    elif p == "w":
                        b |= 2
                    elif p == "x":
                        b |= 1
                    elif p == "X":
                        if is_dir or mode & 0o111:
                            b |= 1
                    elif p in "ugo":
                        b |= (mode >> CLASS_SHIFT[p]) & 7
                bits |= b << shift
                if "s" in perms and cls == "u":
                    bits |= 0o4000
                if "s" in perms and cls == "g":
                    bits |= 0o2000
                if "t" in perms and cls == "o":
                    bits |= 0o1000
            if "t" in perms and not who:
                bits |= 0o1000
            if masked and op != "-":
                bits &= ~UMASK
            class_mask = 0
            for cls in classes:
                class_mask |= 7 << CLASS_SHIFT[cls]
                class_mask |= {"u": 0o4000, "g": 0o2000, "o": 0o1000}[cls]
            if op == "+":
                mode |= bits
            elif op == "-":
                mode &= ~bits
            else:
                mode = (mode & ~class_mask) | bits
    return mode


def _mode_text(mode):
    return f"{mode & 0o7777:04o} ({vfs.mode_string(mode)[1:]})"


def cmd_chmod(ctx, argv, io):
    flags, rest = {}, []
    spec = None
    for a in argv[1:]:
        if spec is None and re.fullmatch(r"-[Rvcf]+", a):
            for ch in a[1:]:
                flags[ch] = True
        elif spec is None and a in ("--recursive", "--verbose", "--changes", "--silent", "--quiet"):
            flags[LONG[a]] = True
        elif spec is None:
            spec = a
        else:
            rest.append(a)
    if spec is None:
        io.err("chmod: пропущен операнд\nПо команде «man chmod» можно получить справку.")
        return 1
    if not rest:
        io.err(f"chmod: после '{spec}' пропущен операнд")
        return 1
    if apply_mode(spec, 0o644, False) is None:
        io.err(f"chmod: неверный режим: '{spec}'")
        return 1
    sb = ctx.sb
    status = 0

    def change(vrel, shown):
        nonlocal status
        if sb.islink(vrel) and shown is not None and "R" in flags and not top:
            return
        try:
            if not sb.exists(vrel):
                raise FsError(vfs.ENOENT)
            old = st.S_IMODE(sb.stat(vrel).st_mode)
            new = apply_mode(spec, old, sb.isdir(vrel))
            if not ctx.priv:
                new &= 0o1777
            sb.chmod(vrel, new, ctx.priv)
            ctx.wrote = True
            if "v" in flags or ("c" in flags and old != new):
                if old == new:
                    io.out(f"права доступа '{shown}' сохранены как {_mode_text(old)}\n")
                else:
                    io.out(f"права доступа '{shown}' изменены с {_mode_text(old)} на {_mode_text(new)}\n")
        except FsError as e:
            if "f" not in flags:
                verb = "изменение прав доступа для" if str(e) == vfs.EPERM else "невозможно получить доступ к"
                io.err(f"chmod: {verb} '{shown}': {e}")
            status = 1

    for name in rest:
        top = True
        try:
            vrel = ctx.resolve(name)
        except FsError as e:
            io.err(f"chmod: '{name}': {e}")
            status = 1
            continue
        change(vrel, name)
        if "R" in flags and _is_real_dir(sb, vrel):
            top = False
            stack = [(vrel, name)]
            while stack:
                dv, ds = stack.pop()
                try:
                    names = sb.listdir(dv, ctx.priv)
                except FsError as e:
                    io.err(f"chmod: невозможно прочитать каталог '{ds}': {e}")
                    status = 1
                    continue
                for child in names:
                    cv, cs = _join(dv, child), _shown_join(ds, child)
                    if sb.islink(cv):
                        continue
                    change(cv, cs)
                    if _is_real_dir(sb, cv):
                        stack.append((cv, cs))
    return status


# ========================================================= chown, chgrp ===

def _owner_change(ctx, argv, io, name):
    """chown [-R] [-v] ВЛАДЕЛЕЦ[:ГРУППА] ФАЙЛ… и chgrp [-R] [-v] ГРУППА ФАЙЛ… (только root, как в Linux)."""
    flags, rest, spec = {}, [], None
    for a in argv[1:]:
        if spec is None and re.fullmatch(r"-[Rvcfh]+", a):
            for ch in a[1:]:
                flags[ch] = True
        elif spec is None and a in ("--recursive", "--verbose", "--changes", "--silent", "--quiet"):
            flags[LONG[a]] = True
        elif spec is None:
            spec = a
        else:
            rest.append(a)
    if spec is None:
        io.err(f"{name}: пропущен операнд\nПо команде «man {name}» можно получить справку.")
        return 1
    if not rest:
        io.err(f"{name}: после '{spec}' пропущен операнд")
        return 1
    sb = ctx.sb
    if name == "chgrp":
        user, group = None, spec
    else:
        user, sep, group = spec.partition(":")
        user = user or None
        # «user:» — группа = основная группа пользователя (в Debian она называется так же, как пользователь)
        group = group or (user if sep else None)
    if user is not None and not (user.isdigit() or sb.known_user(user)):
        io.err(f"{name}: неверный пользователь: «{user}»")
        return 1
    if group and not (group.isdigit() or sb.known_group(group)):
        io.err(f"{name}: неверная группа: «{group}»")
        return 1
    if not sb.per_file_owners:
        io.err(f"{name}: в этом задании владельцев файлов менять не нужно")
        return 1
    status = 0

    def change(vrel, shown):
        nonlocal status
        try:
            if not sb.lexists(vrel):
                raise FsError(vfs.ENOENT)
            sb.check_traverse(vrel, ctx.priv)
            if not ctx.priv:
                raise FsError(vfs.EPERM)
            if not sb.writable:
                raise FsError(vfs.EROFS)
            old_u, old_g = sb.owner(vrel), sb.group(vrel)
            new_u, new_g = user or old_u, group or old_g
            sb.set_owner(vrel, new_u, new_g)
            # Как в Linux: смена владельца или группы обычного файла снимает SUID/SGID.
            if sb.isfile(vrel) and not sb.islink(vrel) and (new_u, new_g) != (old_u, old_g):
                mode = st.S_IMODE(sb.stat(vrel).st_mode)
                if mode & 0o6000:
                    os.chmod(sb.real(vrel), mode & ~0o6000)
            ctx.wrote = True
            if "v" in flags or ("c" in flags and (new_u, new_g) != (old_u, old_g)):
                if (new_u, new_g) == (old_u, old_g):
                    io.out(f"владелец '{shown}' сохранён как {old_u}:{old_g}\n")
                else:
                    io.out(f"владелец '{shown}' изменён с {old_u}:{old_g} на {new_u}:{new_g}\n")
        except FsError as e:
            if "f" not in flags:
                verb = "изменение владельца для" if str(e) == vfs.EPERM else "невозможно получить доступ к"
                io.err(f"{name}: {verb} '{shown}': {e}")
            status = 1

    for arg in rest:
        try:
            vrel = ctx.resolve(arg)
        except FsError as e:
            io.err(f"{name}: '{arg}': {e}")
            status = 1
            continue
        change(vrel, arg)
        if "R" in flags and _is_real_dir(sb, vrel):
            stack = [(vrel, arg)]
            while stack:
                dv, ds = stack.pop()
                try:
                    names = sb.listdir(dv, ctx.priv)
                except FsError as e:
                    io.err(f"{name}: невозможно прочитать каталог '{ds}': {e}")
                    status = 1
                    continue
                for child in names:
                    cv, cs = _join(dv, child), _shown_join(ds, child)
                    change(cv, cs)
                    if _is_real_dir(sb, cv) and not sb.islink(cv):
                        stack.append((cv, cs))
    return status


def cmd_chown(ctx, argv, io):
    return _owner_change(ctx, argv, io, "chown")


def cmd_chgrp(ctx, argv, io):
    return _owner_change(ctx, argv, io, "chgrp")


# =================================================================== ln ===

def cmd_ln(ctx, argv, io):
    parsed = parse_opts("ln", argv, "sfvnrTb", io, with_value="t", longs={**LONG, "--target-directory": "t"})
    if parsed is None:
        return 1
    flags, operands = parsed
    sb = ctx.sb
    if not operands and "t" not in flags:
        io.err("ln: пропущен операнд, задающий файл\nПо команде «man ln» можно получить справку.")
        return 1
    if len(operands) == 1 and "t" not in flags:
        operands = operands + ["."]
    items = _targets(ctx, "ln", operands, flags, io)
    if items is None:
        return 1
    status = 0
    for target, target_vrel, link_vrel, link_shown in items:
        if target_vrel is None and "s" not in flags:
            status = 1
            continue
        if link_shown == "." or link_shown.endswith("/."):
            link_shown = posixpath.basename(target.rstrip("/"))
        try:
            if sb.lexists(link_vrel):
                if "f" not in flags:
                    raise FsError(vfs.EEXIST)
                if _is_real_dir(sb, link_vrel):
                    raise FsError(vfs.EISDIR)
                sb.unlink(link_vrel, ctx.priv)
            if "s" in flags:
                sb.symlink(target, link_vrel, ctx.priv)
            else:
                if not sb.lexists(target_vrel):
                    io.err(f"ln: не удалось получить доступ к '{target}': {vfs.ENOENT}")
                    status = 1
                    continue
                sb.hardlink(target_vrel, link_vrel, ctx.priv)
            ctx.wrote = True
            if "v" in flags:
                io.out(f"'{link_shown}' -> '{target}'\n")
        except FsError as e:
            kind = "символьную ссылку" if "s" in flags else "жёсткую ссылку"
            io.err(f"ln: не удалось создать {kind} '{link_shown}': {e}")
            status = 1
    return status


# ============================================================= readlink ===

def cmd_readlink(ctx, argv, io):
    parsed = parse_opts("readlink", argv, "femnqsvz", io)
    if parsed is None:
        return 1
    flags, operands = parsed
    if not operands:
        io.err("readlink: пропущен операнд")
        return 1
    status = 0
    sb = ctx.sb
    for name in operands:
        try:
            vrel = ctx.resolve(name)
        except FsError as e:
            io.err(f"readlink: {name}: {e}")
            status = 1
            continue
        if "f" in flags or "e" in flags or "m" in flags:
            if "e" in flags and not sb.exists(vrel):
                status = 1
                continue
            io.out(sb.display(sb.real_vrel(vrel)) + "\n")
            continue
        if not sb.islink(vrel):
            status = 1
            continue
        io.out(sb.readlink(vrel) + "\n")
    return status


# ================================================================= file ===

def _describe(sb, vrel, priv):
    if sb.islink(vrel):
        return f"symbolic link to {sb.readlink(vrel)}"
    if sb.isdir(vrel):
        return "directory"
    data = sb.read_bytes(vrel, priv)[:4096]
    if not data:
        return "empty"
    if data.startswith(b"\x89PNG"):
        return "PNG image data"
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG image data"
    if data.startswith(b"\x1f\x8b"):
        return "gzip compressed data"
    if data.startswith(b"%PDF"):
        return "PDF document"
    if data.startswith(b"PK\x03\x04"):
        return "Zip archive data"
    if data.startswith(b"SQLite format 3"):
        return "SQLite 3.x database"
    if data.startswith(b"\x7fELF"):
        return "ELF 64-bit LSB pie executable, x86-64"
    if b"\0" in data:
        return "data"
    try:
        text = data.decode("utf-8")
        kind = "ASCII text" if text.isascii() else "Unicode text, UTF-8 text"
    except UnicodeDecodeError:
        return "data"
    if text.startswith("#!"):
        first = text.split("\n", 1)[0]
        interp = "Bourne-Again shell script" if "bash" in first else \
            "Python script" if "python" in first else "POSIX shell script"
        executable = " executable" if sb.can(vrel, 1, False) else ""
        return f"{interp}, {kind}{executable}"
    return kind


def cmd_file(ctx, argv, io):
    operands = [a for a in argv[1:] if not a.startswith("-")]
    if not operands:
        io.err("Использование: file ФАЙЛ...")
        return 1
    width = max(len(n) for n in operands) + 1
    for name in operands:
        try:
            vrel = ctx.resolve(name)
            if not ctx.sb.lexists(vrel):
                raise FsError(vfs.ENOENT)
            desc = _describe(ctx.sb, vrel, ctx.priv)
        except FsError as e:
            desc = f"невозможно открыть '{name}' ({e})"
        io.out(f"{name + ':':<{width}} {desc}\n")
    return 0


# ==================================================== basename / dirname ===

def cmd_basename(ctx, argv, io):
    args = argv[1:]
    if not args:
        io.err("basename: пропущен операнд")
        return 1
    name = args[0].rstrip("/") or "/"
    base = posixpath.basename(name) or "/"
    if len(args) > 1 and base != args[1] and base.endswith(args[1]):
        base = base[: -len(args[1])]
    io.out(base + "\n")
    return 0


def cmd_dirname(ctx, argv, io):
    if len(argv) < 2:
        io.err("dirname: пропущен операнд")
        return 1
    for name in argv[1:]:
        stripped = name.rstrip("/") or "/"
        d = posixpath.dirname(stripped)
        io.out((d.rstrip("/") or "/" if d else ".") + "\n")
    return 0


# ================================================================= tree ===

def plural(n, one, few, many):
    if n % 10 == 1 and n % 100 != 11:
        return f"{n} {one}"
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return f"{n} {few}"
    return f"{n} {many}"


def cmd_tree(ctx, argv, io):
    parsed = parse_opts("tree", argv, "adfF", io, with_value="L")
    if parsed is None:
        return 1
    flags, operands = parsed
    try:
        max_depth = int(flags["L"]) if "L" in flags else None
    except ValueError:
        io.err("tree: неверный уровень, должно быть число больше 0")
        return 1
    sb = ctx.sb
    dirs = files = 0
    lines = []

    def walk(vrel, shown, prefix, depth):
        nonlocal dirs, files
        if max_depth is not None and depth > max_depth:
            return
        try:
            names = sb.listdir(vrel, ctx.priv)
        except FsError as e:
            lines.append(prefix + f"[ошибка открытия каталога: {e}]")
            return
        names = [n for n in names if "a" in flags or not n.startswith(".")]
        if "d" in flags:
            names = [n for n in names if sb.isdir(_join(vrel, n))]
        for k, child in enumerate(names):
            cv = _join(vrel, child)
            last = k == len(names) - 1
            label = _shown_join(shown, child) if "f" in flags else child
            is_dir = sb.isdir(cv)
            if sb.islink(cv):
                label += f" -> {sb.readlink(cv)}"
            elif is_dir and "F" in flags:
                label += "/"
            elif "F" in flags and sb.can(cv, 1, False):
                label += "*"
            lines.append(prefix + ("└── " if last else "├── ") + label)
            if is_dir:
                dirs += 1
                if not sb.islink(cv):
                    walk(cv, _shown_join(shown, child), prefix + ("    " if last else "│   "), depth + 1)
            else:
                files += 1

    status = 0
    for name in operands or ["."]:
        try:
            vrel = ctx.resolve(name)
        except FsError as e:
            io.err(f"tree: {name}: {e}")
            status = 2
            continue
        if not sb.isdir(vrel):
            lines.append(f"{name}  [ошибка открытия каталога]")
            continue
        lines.append(name)
        walk(vrel, name, "", 1)
    summary = plural(dirs, "каталог", "каталога", "каталогов")
    if "d" not in flags:
        summary += ", " + plural(files, "файл", "файла", "файлов")
    io.out("\n".join(lines) + "\n\n" + summary + "\n")
    return status
