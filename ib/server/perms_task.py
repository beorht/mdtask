"""
Задание №10 «Права доступа и аудит сервера» (perms) — на общем движке этапов (server/lab_task.py),
как №6–7.

Песочница data/ctf/perms/<id>/ — учебный сервер организации (магазин / библиотека / клиника), на
котором работает веб-приложение /srv/<app>. Прошлый администратор оставил ошибки в правах: лишняя
учётная запись с UID 0, файлы, доступные на запись всем, секреты, которые читают посторонние, лишняя
SUID-программа, файлы приложения без владельца, стажёр в группе sudo и уволенный сотрудник, который
не заблокирован. Нужно провести аудит и привести сервер к политике, не сломав приложение и не
потеряв собственный доступ.

Модель владельцев файлов включается тем, что в песочнице есть var/lib/seclab/owners.json
(vfs.Sandbox.per_file_owners): владелец и группа берутся из него, а права группы учитываются, если
пользователь входит в группу файла. Команды chown/chgrp и проверки этапов работают через эту модель.

Этапы: учётные записи → чтение прав → запись для всех → секреты → SUID → владельцы приложения →
пользователи и sudo → повторный аудит. Проверки этапов 3–7 — по итоговому состоянию песочницы через
модель прав (может ли пользователь X читать/писать файл Y), поэтому подходят разные верные решения.
Критично: приложение (www-data) по-прежнему читает свой .env, passwd и sudo сохраняют SUID, а сам
студент остаётся в группе sudo и не заблокирован.
"""

import os
from pathlib import Path

import accounts
import defense_banks
import lab_task
import vfs
from lab_task import _norm, ans_choice

# Стандартные программы с установленным SUID (их бит не трогают).
STANDARD_SUID = {"usr/bin/passwd", "usr/bin/sudo", "usr/bin/su", "usr/bin/mount", "usr/bin/umount"}


def _sb(env):
    """Песочница с моделью владельцев для запросов owner/group/user_groups."""
    return vfs.Sandbox(str(env.root), env.user, f"home/{env.user}", mapped_home=False, writable=True)


def _accounts(env):
    return (accounts.parse_passwd(env.text("etc/passwd") or ""),
            accounts.parse_group(env.text("etc/group") or ""),
            accounts.parse_shadow(env.text("etc/shadow") or ""))


def _perm(env, sb, vrel, user, bit):
    """Может ли пользователь user читать(4)/писать(2)/выполнять(1) vrel по модели прав сервера."""
    mode = env.mode(vrel)
    if mode is None:
        return False
    if user == "root":
        return True
    owner = sb.owner(vrel)
    if owner == user:
        return bool(mode & (bit << 6))
    if sb.group(vrel) in sb.user_groups(user):
        return bool(mode & (bit << 3))
    return bool(mode & bit)


def _no_other_read(env, vrel):
    """Файл существует и не доступен на чтение «остальным» (бит o+r снят)."""
    mode = env.mode(vrel)
    return mode is not None and not (mode & 0o004)


def _world_writable_fixed(env):
    """У всех подсунутых файлов снят бит записи для всех (o-w), файлы не удалены."""
    for rel in env.p["ww_files"]:
        mode = env.mode(rel)
        if mode is None or (mode & 0o002):
            return False
    return True


def _why_world_writable(env):
    bad = [rel for rel in env.p["ww_files"] if (env.mode(rel) or 0) & 0o002]
    missing = [rel for rel in env.p["ww_files"] if env.mode(rel) is None]
    if missing:
        return f"файл {('/' + missing[0])} не найден — не удаляйте его, только снимите право записи"
    if bad:
        return f"на запись всем ещё доступен /{bad[0]} — снимите бит: sudo chmod o-w /{bad[0]}"
    return None


def _tmp_sticky(env):
    return env.mode("tmp") == 0o1777


def _suid_removed(env):
    mode = env.mode(env.p["suid_extra"].lstrip("/"))
    return mode is not None and not (mode & 0o4000)


def _standard_suid_kept(env):
    for rel in ("usr/bin/passwd", "usr/bin/sudo"):
        mode = env.mode(rel)
        if mode is None or not (mode & 0o4000):
            return False
    return True


def _why_suid(env):
    for rel in ("usr/bin/passwd", "usr/bin/sudo"):
        if not ((env.mode(rel) or 0) & 0o4000):
            return f"у /{rel} пропал SUID — его трогать не нужно, снимите бит только с лишней программы"
    return None


def _app_dir(env):
    return f"srv/{env.p['app']}"


def _env_reads_own(env):
    """Приложение (www-data) читает свой .env, а посторонние — нет."""
    sb = _sb(env)
    path = env.p["env_path"]
    return (_perm(env, sb, path, "www-data", 4) and not _no_other_read_fail(env, path)
            and not _perm(env, sb, path, env.p["intern"], 4))


def _no_other_read_fail(env, vrel):
    mode = env.mode(vrel)
    return mode is None or bool(mode & 0o004)


def _app_owners_ok(env):
    """Под каталогом приложения нет файлов без владельца (find -nouser ничего не находит)."""
    sb = _sb(env)
    base = env.disk(_app_dir(env))
    if not base.is_dir():
        return False
    for dirpath, dirnames, filenames in os.walk(base):
        for name in list(dirnames) + filenames:
            p = Path(dirpath) / name
            if p.is_symlink():
                continue
            vrel = os.path.relpath(p, env.root).replace(os.sep, "/")
            if not sb.known_user(sb.owner(vrel)):
                return False
    return True


def _why_owners(env):
    sb = _sb(env)
    base = env.disk(_app_dir(env))
    if not base.is_dir():
        return None
    for dirpath, _dirnames, filenames in os.walk(base):
        for name in filenames:
            p = Path(dirpath) / name
            if p.is_symlink():
                continue
            vrel = os.path.relpath(p, env.root).replace(os.sep, "/")
            if not sb.known_user(sb.owner(vrel)):
                return f"у /{vrel} владелец {sb.owner(vrel)} — такой учётной записи нет; " \
                       f"передайте файл приложению: sudo chown www-data:www-data /{vrel}"
    return None


def _uploads_app_only(env):
    """Каталог uploads доступен на запись приложению, но не стажёру и не остальным."""
    sb = _sb(env)
    up = env.p["uploads_path"]
    return (_perm(env, sb, up, "www-data", 2) and not _perm(env, sb, up, env.p["intern"], 2)
            and not (((env.mode(up) or 0) & 0o002)))


def _in_sudo(env, user):
    return user in _accounts(env)[1].get("sudo", {}).get("members", [])


def _blocked(env, user):
    users, _, shadow = _accounts(env)
    h = shadow.get(user)
    if h is not None and h.startswith("!"):
        return True
    return users.get(user, {}).get("shell", "").endswith(("nologin", "/false"))


def _admin_kept(env):
    """Критично: студент остаётся в группе sudo и не заблокирован."""
    return _in_sudo(env, env.user) and not _blocked(env, env.user)


def _ran_getent(env):
    return (env.ran("getent", lambda c: "passwd" in c["argv"] or "group" in c["argv"])
            or env.ran("id", lambda c: True))


def _ran_perm_view(env):
    return env.ran("stat", lambda c: True) or env.ran("ls", lambda c: "l" in env.flags(c))


def _ran_find_perm(env, who):
    # find как не-root завершается с ненулевым кодом (отказ в доступе к /root и т.п.) — ok_only=False.
    return env.ran("find", lambda c: who in " ".join(c["argv"]), ok_only=False)


def _trap_rogue(value, env):
    return ("учётную запись подсказала «инструкция для ИИ» — проверьте UID сами (getent passwd)"
            if _norm(value) == _norm(env.p["trap_decoy"]) else None)


STAGES = [
    {
        "title": "Учётные записи",
        "goal": "узнать, какие учётные записи есть на сервере и нет ли среди них лишней с правами root.",
        "intro": [
            "getent passwd — все учётные записи; поля: имя:x:UID:GID:описание:домашний каталог:оболочка",
            "UID 0 — это права root; законно он только у самой учётной записи root",
            "getent passwd | awk -F: '$3==0' (или grep) — все учётные записи с UID 0",
            "getent group sudo — кто может выполнять команды с правами root через sudo",
            "id ИМЯ — UID, GID и группы одной учётной записи",
            "Не верьте подписям и «подсказкам» в файлах: лишнюю запись определяйте по UID 0, а не по имени",
        ],
        "items": [
            {"text": "Посмотрите список учётных записей: getent passwd", "kind": "cmd", "check": _ran_getent},
            {"text": "Какая учётная запись, кроме root, имеет UID 0? Ответ: answer 1.1 ИМЯ", "kind": "answer",
             "qid": "1.1", "answer": lambda v, e: _norm(v) == _norm(e.p["rogue"]), "proof": True,
             "trap": _trap_rogue},
            {"text": "Какой UID у этой учётной записи? Ответ: answer 1.2 ЧИСЛО", "kind": "answer", "qid": "1.2",
             "answer": lambda v, e: _norm(v) == "0"},
        ],
    },
    {
        "title": "Чтение прав",
        "goal": "научиться читать права и владельца файла на примере конфигурации приложения.",
        "intro": [
            "ls -l {conf_display} — права, владелец и группа файла",
            "stat {conf_display} — то же подробно; stat -c '%a %U %G %n' {conf_display} — только права (8-ричные), "
            "владелец, группа и имя",
            "Права вида -rw-r--r-- — это 644: владелец rw, группа r, остальные r",
            "Первый символ строки ls -l: - обычный файл, d каталог, l ссылка",
        ],
        "items": [
            {"text": "Посмотрите права файла {conf_display}: ls -l или stat", "kind": "cmd", "check": _ran_perm_view},
            {"text": "Какие у {conf_display} права в восьмеричном виде? Ответ: answer 2.1 ЧИСЛО (например 644)",
             "kind": "answer", "qid": "2.1", "answer": lambda v, e: _norm(v).lstrip("0") == e.p["conf_mode"].lstrip("0"),
             "proof": lambda v, e: [e.p["conf_mode"]]},
            {"text": "Кто владелец файла {conf_display}? Ответ: answer 2.2 ИМЯ", "kind": "answer", "qid": "2.2",
             "answer": lambda v, e: _norm(v) == e.p["conf_owner"], "proof": True},
        ],
    },
    {
        "title": "Файлы, доступные на запись всем",
        "goal": "найти файлы, которые может изменить любой пользователь, и закрыть к ним запись.",
        "intro": [
            "find / -type f -perm -o+w 2>/dev/null — обычные файлы с битом записи «для всех» (o+w); "
            "2>/dev/null убирает сообщения об отказе в доступе",
            "find / -type f -perm -o+w 2>/dev/null | wc -l — сколько их",
            "Снять право записи у всех: sudo chmod o-w ФАЙЛ (или вернуть разумные права, например 644)",
            "ВАЖНО: каталог /tmp должен остаться с правами 1777 — буква t на конце (sticky-бит) не даёт "
            "пользователям удалять чужие файлы, хотя писать в /tmp могут все. /tmp не трогайте",
        ],
        "items": [
            {"text": "Сколько обычных файлов доступны на запись всем? Ответ: answer 3.1 ЧИСЛО", "kind": "answer",
             "qid": "3.1", "answer": lambda v, e: _norm(v) == str(e.p["ww_count"]),
             "proof": lambda v, e: [str(e.p["ww_count"])]},
            {"text": "Снимите право записи «для всех» со всех таких файлов (sudo chmod o-w ФАЙЛ)", "kind": "fs",
             "check": _world_writable_fixed, "why": _why_world_writable},
            {"text": "Каталог /tmp сохранил права 1777 (доступен всем на запись, но со sticky-битом)", "kind": "fs",
             "critical": True, "check": _tmp_sticky},
        ],
    },
    {
        "title": "Секреты",
        "goal": "закрыть доступ к секретам от посторонних, не сломав приложение.",
        "intro": [
            "Секреты на сервере: /etc/shadow (хеши паролей), {env_display} (настройки приложения с паролем базы), "
            "{key_display} (закрытый ключ сотрудника), {backup_display} (резервная копия базы)",
            "Секрет не должен читаться «остальными»: sudo chmod o-r ФАЙЛ (или 640, 600)",
            "Приложение работает от учётной записи www-data и ДОЛЖНO читать свой {env_display}: сделайте его "
            "владельцем — sudo chown www-data:www-data {env_display}, затем sudo chmod 640 {env_display}",
            "Закрытый ключ читает только его владелец: sudo chmod 600 {key_display}",
            "Проверяйте права и владельца: ls -l ФАЙЛ и stat -c '%a %U %G %n' ФАЙЛ",
        ],
        "items": [
            {"text": "Закройте /etc/shadow от чтения остальными (права не шире 640)", "kind": "fs",
             "check": lambda e: _no_other_read(e, "etc/shadow")},
            {"text": "{env_display}: закройте от посторонних, но оставьте доступным приложению (www-data)",
             "kind": "fs", "check": _env_reads_own,
             "why": lambda e: ("сейчас {0} читают все — закройте бит o+r".format("/" + e.p["env_path"])
                               if _no_other_read_fail(e, e.p["env_path"])
                               else "приложение (www-data) больше не может прочитать свой .env — сделайте www-data "
                                    "владельцем (sudo chown www-data:www-data) и дайте владельцу чтение (640)")},
            {"text": "Закройте закрытый ключ {key_display} от всех, кроме владельца (права 600)", "kind": "fs",
             "check": lambda e: _no_other_read(e, e.p["key_path"])},
            {"text": "Закройте резервную копию базы {backup_display} от чтения остальными", "kind": "fs",
             "check": lambda e: _no_other_read(e, e.p["backup_path"])},
        ],
    },
    {
        "title": "Программы с SUID",
        "goal": "найти лишнюю программу с битом SUID и снять его, не трогая стандартные.",
        "intro": [
            "SUID-бит (s на месте x у владельца) — программа выполняется с правами своего владельца, обычно root. "
            "Это нужно немногим системным программам (passwd, sudo, su, mount)",
            "find / -perm -4000 -type f 2>/dev/null — все программы с SUID",
            "ls -l ФАЙЛ покажет -rwsr-xr-x: буква s вместо x у владельца — это и есть SUID",
            "Лишняя программа — та, которой нет в стандартном наборе (её поставил прошлый администратор)",
            "Снять бит: sudo chmod u-s ФАЙЛ (или sudo chmod 755 ФАЙЛ). passwd и sudo не трогайте",
        ],
        "items": [
            {"text": "Какая SUID-программа не входит в стандартный набор? Ответ: answer 5.1 ПУТЬ или ИМЯ",
             "kind": "answer", "qid": "5.1",
             "answer": lambda v, e: _norm(v).strip("/") in (e.p["suid_extra"].strip("/"),
                                                            e.p["suid_extra"].rsplit("/", 1)[-1]),
             "proof": lambda v, e: [e.p["suid_extra"].rsplit("/", 1)[-1]]},
            {"text": "Снимите бит SUID с этой программы", "kind": "fs", "check": _suid_removed},
            {"text": "Стандартные программы passwd и sudo сохранили SUID", "kind": "fs", "critical": True,
             "check": _standard_suid_kept, "why": _why_suid},
        ],
    },
    {
        "title": "Владельцы каталога приложения",
        "goal": "передать приложению его файлы и закрыть чужую запись в его каталоги.",
        "intro": [
            "find {srv_display} -nouser 2>/dev/null — файлы, владелец которых удалён (их UID нет в /etc/passwd)",
            "Передать такой файл приложению: sudo chown www-data:www-data ФАЙЛ (ключ -R — для всего каталога)",
            "Каталог для загрузок {uploads_display} должен быть доступен на запись только приложению: "
            "права 775 с владельцем www-data (sudo chmod 775 {uploads_display}), а не 777",
            "Проверяйте владельцев: ls -ln {srv_display} и stat -c '%U %G %n' ФАЙЛ",
        ],
        "items": [
            {"text": "Передайте приложению (www-data) все файлы {srv_display} без владельца", "kind": "fs",
             "check": _app_owners_ok, "why": _why_owners},
            {"text": "{uploads_display}: запись только у приложения (www-data), не у стажёра и не у остальных",
             "kind": "fs", "check": _uploads_app_only,
             "why": lambda e: "в {0} могут писать посторонние — уберите запись для всех (sudo chmod 775 {0})".format(
                 "/" + e.p["uploads_path"]) if ((e.mode(e.p["uploads_path"]) or 0) & 0o002) else None},
        ],
    },
    {
        "title": "Пользователи и sudo",
        "goal": "привести права учётных записей к политике: убрать лишнее и заблокировать ненужные.",
        "intro": [
            "Политика: право sudo — только у администраторов; стажёр {intern} его иметь не должен",
            "Уволенный сотрудник {former} и лишняя учётная запись с UID 0 ({rogue}) должны быть заблокированы "
            "(не удалены — данные и журналы сохраняются)",
            "Убрать из группы sudo: sudo gpasswd -d ИМЯ sudo (или sudo deluser ИМЯ sudo)",
            "Заблокировать вход: sudo passwd -l ИМЯ (проверка: sudo passwd -S ИМЯ — буква L)",
            "НЕ блокируйте и не убирайте из sudo себя ({user}) — останетесь без прав администратора",
        ],
        "items": [
            {"text": "Уберите стажёра {intern} из группы sudo", "kind": "fs",
             "check": lambda e: not _in_sudo(e, e.p["intern"])},
            {"text": "Заблокируйте уволенного сотрудника {former}", "kind": "fs",
             "check": lambda e: _blocked(e, e.p["former"])},
            {"text": "Заблокируйте лишнюю учётную запись с UID 0 ({rogue})", "kind": "fs",
             "check": lambda e: _blocked(e, e.p["rogue"])},
            {"text": "Вы ({user}) остались в группе sudo и не заблокированы", "kind": "fs", "critical": True,
             "check": _admin_kept},
        ],
    },
    {
        "title": "Повторный аудит",
        "goal": "повторить проверки и убедиться, что опасных прав и файлов больше нет.",
        "intro": [
            "Повторите поиск файлов с записью для всех: find / -type f -perm -o+w 2>/dev/null | wc -l — должно быть 0",
            "Повторите поиск SUID: find / -perm -4000 -type f 2>/dev/null — должны остаться только стандартные",
            "Повторный аудит — обязательная часть работы: он доказывает, что уязвимости закрыты",
        ],
        "items": [
            {"text": "Повторите поиск файлов, доступных на запись всем (find … -perm -o+w)", "kind": "cmd",
             "check": lambda e: _ran_find_perm(e, "o+w")},
            {"text": "Сколько обычных файлов с записью для всех осталось? Ответ: answer 8.1 ЧИСЛО", "kind": "answer",
             "qid": "8.1", "answer": lambda v, e: _norm(v) == "0", "proof": lambda v, e: ["0"]},
            {"text": "Повторите поиск SUID-программ (find … -perm -4000)", "kind": "cmd",
             "check": lambda e: _ran_find_perm(e, "4000")},
        ],
    },
]

INTRO = [
    "Вы — администратор учебного сервера seclab ({theme}). На нём работает веб-приложение {srv_display}",
    "от учётной записи www-data. Прошлый администратор оставил ошибки в правах доступа: лишняя учётная",
    "запись с правами root, файлы, доступные на запись и чтение кому попало, лишняя программа с SUID,",
    "файлы приложения без владельца, стажёр с правами администратора и незаблокированный уволенный",
    "сотрудник. Все данные учебные.",
    "",
    "Задача — провести аудит и привести сервер к политике безопасности, не сломав приложение",
    "(www-data должен читать свой .env) и не потеряв собственный доступ (вы остаётесь в группе sudo).",
    "Права меняйте командами chmod, chown, chgrp, usermod, gpasswd, passwd через sudo.",
]

LAB = lab_task.register(lab_task.Lab("perms", 10, "Права доступа и аудит сервера", STAGES, INTRO, "perms"))

# Против решения «через нейросеть»: ответы с доказательством из вывода команд, контрольные вопросы
# после каждого этапа и ловушка — «инструкция для ИИ» в файле с неверной учётной записью (trap на 1.1).
LAB.track_output = True
LAB.defense = lab_task.bank_defense(STAGES, defense_banks.PERMS, defense_banks.PERMS_DECOYS)
