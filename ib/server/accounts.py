"""
Учётные записи учебного сервера: разбор и правка /etc/passwd, /etc/shadow, /etc/group.

Функции работают с текстом файлов — их используют и команды эмулятора (passwd, usermod, gpasswd,
getent, groups, id, ssh — cmd_admin.py, sshd_sim.py), и проверки заданий (по файлам песочницы).
"""

from pathlib import Path


def parse_passwd(text):
    """-> {имя: {uid, gid, gecos, home, shell}} в порядке файла."""
    users = {}
    for line in (text or "").splitlines():
        parts = line.split(":")
        if len(parts) < 7 or not parts[0] or line.startswith("#"):
            continue
        try:
            uid, gid = int(parts[2]), int(parts[3])
        except ValueError:
            continue
        users[parts[0]] = {"uid": uid, "gid": gid, "gecos": parts[4], "home": parts[5], "shell": parts[6]}
    return users


def parse_group(text):
    """-> {группа: {gid, members: [..]}}."""
    groups = {}
    for line in (text or "").splitlines():
        parts = line.split(":")
        if len(parts) < 4 or not parts[0] or line.startswith("#"):
            continue
        try:
            gid = int(parts[2])
        except ValueError:
            continue
        groups[parts[0]] = {"gid": gid, "members": [m for m in parts[3].split(",") if m]}
    return groups


def parse_shadow(text):
    """-> {имя: хеш}; хеш с «!» в начале — учётная запись заблокирована."""
    out = {}
    for line in (text or "").splitlines():
        parts = line.split(":")
        if len(parts) >= 2 and parts[0]:
            out[parts[0]] = parts[1]
    return out


def is_locked(hash_):
    return hash_ is None or hash_.startswith("!")


def has_password(hash_):
    """Пароль задан и вход по паролю возможен (не «*», не «!», не пусто)."""
    return bool(hash_) and not hash_.startswith(("!", "*"))


def user_groups(user, users, groups):
    """Все группы пользователя: основная + дополнительные (как id -Gn)."""
    info = users.get(user)
    out = []
    if info:
        for name, g in groups.items():
            if g["gid"] == info["gid"]:
                out.append(name)
                break
    for name, g in groups.items():
        if user in g["members"] and name not in out:
            out.append(name)
    return out


def set_shadow_lock(text, user, lock):
    """Ставит/снимает «!» перед хешем. -> (новый текст, изменено ли) или None, если нет пользователя."""
    lines = (text or "").splitlines()
    for i, line in enumerate(lines):
        parts = line.split(":")
        if len(parts) >= 2 and parts[0] == user:
            h = parts[1]
            if lock and not h.startswith("!"):
                parts[1] = "!" + h
            elif not lock and h.startswith("!"):
                parts[1] = h[1:]
            else:
                return text, False
            lines[i] = ":".join(parts)
            return "\n".join(lines) + "\n", True
    return None


def set_group_member(text, group, user, add):
    """Добавляет/удаляет участника группы. -> (текст, изменено) или None, если нет группы."""
    lines = (text or "").splitlines()
    for i, line in enumerate(lines):
        parts = line.split(":")
        if len(parts) >= 4 and parts[0] == group:
            members = [m for m in parts[3].split(",") if m]
            if add and user not in members:
                members.append(user)
            elif not add and user in members:
                members.remove(user)
            else:
                return text, False
            parts[3] = ",".join(members)
            lines[i] = ":".join(parts)
            return "\n".join(lines) + "\n", True
    return None


def set_passwd_field(text, user, index, value):
    lines = (text or "").splitlines()
    for i, line in enumerate(lines):
        parts = line.split(":")
        if len(parts) >= 7 and parts[0] == user:
            if parts[index] == value:
                return text, False
            parts[index] = value
            lines[i] = ":".join(parts)
            return "\n".join(lines) + "\n", True
    return None


# ------------------------------------------- чтение из песочницы (проверки) ---

def _read(root, rel):
    try:
        return (Path(root) / rel).read_text(encoding="utf-8")
    except OSError:
        return ""


def load(root):
    """(users, groups, shadow) учебного сервера по корню песочницы."""
    return (parse_passwd(_read(root, "etc/passwd")), parse_group(_read(root, "etc/group")),
            parse_shadow(_read(root, "etc/shadow")))
