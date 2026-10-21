"""
Задание №6 «Расследование инцидента по журналам» (incident) — по сценарию «Миссия 5. Реагирование
на инцидент» (data/TermialEmulatorScenariy).

У каждого студента своя песочница (data/ctf/incident/<id>/) и свой инцидент: учётная запись,
к которой подбирали пароль, IP атакующего и сканера, число попыток, время входа, файл, права
которого изменили. Значения и то, что из них следует (строки временной шкалы, SHA-256 журнала),
генератор (ctf/incident/generate_incident.py) кладёт в params.

Этапы: осмотр журналов → сохранение доказательств → неудачные входы → успешный вход и действия →
временная шкала → факты и гипотезы → сдерживание → отчёт. Журналы менять нельзя (критично).
"""

import hashlib
import re

import accounts
import defense_banks
import lab_task
from lab_task import _norm, ans_choice, ans_time, lines_of

AUTH = "var/log/auth.log"


def _sha(env, vrel):
    data = env.read(vrel)
    return None if data is None else hashlib.sha256(data).hexdigest()


def _log_intact(env):
    return _sha(env, AUTH) == env.p["auth_sha256"]


def _evidence_copy(env):
    return _sha(env, env.h("evidence/auth.log")) == env.p["auth_sha256"]


def _evidence_sum(env):
    text = env.text(env.h("evidence/auth.log.sha256")) or ""
    return env.p["auth_sha256"] in text.lower()


def _read_auth(env, c):
    return c.get("priv") and AUTH in env.targets(c)


def _ran_read_auth(env):
    return any(env.ran(n, lambda c: _read_auth(env, c)) for n in ("cat", "head", "tail", "less", "more", "grep", "wc"))


def _shadow(env):
    return accounts.parse_shadow(env.text("etc/shadow"))


def _groups(env):
    return accounts.parse_group(env.text("etc/group"))


def _locked(env, user):
    h = _shadow(env).get(user)
    if h is not None and h.startswith("!"):
        return True
    users = accounts.parse_passwd(env.text("etc/passwd"))
    return users.get(user, {}).get("shell", "").endswith(("nologin", "/false"))


def _in_sudo(env, user):
    return user in _groups(env).get("sudo", {}).get("members", [])


def _admins_ok(env):
    """Администраторы не пострадали: admin и сам студент не заблокированы и остались в sudo."""
    sh = _shadow(env)
    for u in ("admin", env.user):
        if not _in_sudo(env, u) or (sh.get(u) or "").startswith("!"):
            return False
    return True


def _report_fields(env):
    out = {}
    for line in (env.text(env.h("incident/report.txt")) or "").splitlines():
        key, sep, value = line.partition(":")
        if sep:
            out[_norm(key)] = value.strip()
    return out


def _field(env, name, pred):
    value = _report_fields(env).get(_norm(name))
    return bool(value) and pred(value)


def _why_timeline(env, rel, key):
    got = lines_of(env, env.h(rel))
    if got is None:
        return None
    want = env.p[key]
    if len(got) != len(want):
        return f"в файле {len(got)} строк(и), а нужных строк в журнале — {len(want)}"
    return "строки не совпадают с журналом (не меняйте их и сохраните порядок)"


STAGES = [
    {
        "title": "Первичный осмотр журналов",
        "goal": "узнать, какие журналы есть на сервере и за какой период они ведутся.",
        "intro": [
            "ls -l /var/log — список журналов: владелец root, группа adm, читать их может только root",
            "sudo head -n 5 /var/log/auth.log и sudo tail -n 5 /var/log/auth.log — начало и конец журнала входов",
            "sudo wc -l /var/log/auth.log — сколько в нём записей (строк)",
            "Формат строки: «Oct 11 02:47:13 seclab sshd[2314]: Failed password for ИМЯ from IP port N ssh2»",
            "ВАЖНО: журналы — доказательства. Их нельзя изменять, удалять и «чистить» — только читать",
        ],
        "items": [
            {"text": "Посмотрите список журналов: ls -l /var/log", "kind": "cmd",
             "check": lambda e: e.ran("ls", lambda c: "var/log" in e.targets(c))},
            {"text": "Прочитайте /var/log/auth.log с правами root (sudo head, sudo tail или sudo cat)", "kind": "cmd",
             "check": _ran_read_auth},
            {"text": "Сколько строк в /var/log/auth.log? Ответ: answer 1.1 ЧИСЛО", "kind": "answer", "qid": "1.1",
             "answer": lambda v, e: _norm(v) == str(e.p["auth_lines"]), "proof": lambda v, e: [str(e.p["auth_lines"])]},
            {"text": "Во сколько сделана последняя запись журнала? Ответ: answer 1.2 ЧЧ:ММ:СС", "kind": "answer",
             "qid": "1.2", "answer": lambda v, e: ans_time(e.p["last_time"])(v, e),
             "proof": lambda v, e: [e.p["last_time"]]},
        ],
    },
    {
        "title": "Сохранение доказательств",
        "goal": "до любых действий сохранить копию журнала и его контрольную сумму, чтобы потом доказать, "
                "что журнал не менялся.",
        "intro": [
            "mkdir ~/evidence — каталог для доказательств",
            "sudo cp /var/log/auth.log ~/evidence/auth.log — копия журнала (оригинал остаётся на месте!)",
            "sudo sha256sum /var/log/auth.log > ~/evidence/auth.log.sha256 — контрольная сумма оригинала",
            "sha256sum -c ~/evidence/auth.log.sha256 (через sudo) — проверка: «ЦЕЛ» значит, что файл не изменён",
            "Дальше анализируйте копию или оригинал только командами чтения (grep, cat, wc ...)",
        ],
        "items": [
            {"text": "Сохраните точную копию журнала в ~/evidence/auth.log", "kind": "fs",
             "check": _evidence_copy,
             "why": lambda e: "копия отличается от оригинала — скопируйте заново командой sudo cp"
             if e.exists(e.h("evidence/auth.log")) else None},
            {"text": "Сохраните SHA-256 оригинала /var/log/auth.log в ~/evidence/auth.log.sha256", "kind": "fs",
             "check": _evidence_sum},
            {"text": "Исходный журнал /var/log/auth.log не изменён и не удалён", "kind": "fs", "critical": True,
             "check": _log_intact},
        ],
    },
    {
        "title": "Неудачные попытки входа",
        "goal": "найти подбор пароля и отличить его от обычного «шума» в журнале.",
        "intro": [
            "sudo grep 'Failed password' /var/log/auth.log | wc -l — сколько всего неудачных попыток",
            "«Failed password for invalid user X» — такого пользователя на сервере НЕТ (перебор имён);",
            "«Failed password for X» без invalid user — пароль подбирали к СУЩЕСТВУЮЩЕЙ учётной записи",
            "IP-адреса попыток: sudo grep 'Failed password' /var/log/auth.log | grep -v invalid | "
            "grep -o 'from [0-9.]*' | sort | uniq -c",
            "Одна ошибка пароля — обычная опечатка, а не атака; подозрительна серия попыток подряд",
        ],
        "items": [
            {"text": "Сколько всего строк «Failed password» в журнале? Ответ: answer 3.1 ЧИСЛО", "kind": "answer",
             "qid": "3.1", "answer": lambda v, e: _norm(v) == str(e.p["failed_total"]),
             "proof": lambda v, e: [str(e.p["failed_total"])]},
            {"text": "С какого IP подбирали пароль к существующей учётной записи (не invalid user)? "
                     "Ответ: answer 3.2 IP", "kind": "answer", "qid": "3.2",
             "answer": lambda v, e: _norm(v) == e.p["attacker_ip"], "proof": lambda v, e: [e.p["attacker_ip"]]},
            {"text": "К какой учётной записи подбирали пароль? Ответ: answer 3.3 ИМЯ", "kind": "answer",
             "qid": "3.3", "answer": lambda v, e: _norm(v) == e.p["target"], "proof": lambda v, e: [e.p["target"]]},
            {"text": "Сколько неудачных попыток было с этого IP? Ответ: answer 3.4 ЧИСЛО", "kind": "answer",
             "qid": "3.4", "answer": lambda v, e: _norm(v) == str(e.p["attack_failed"]),
             "proof": lambda v, e: [str(e.p["attack_failed"])]},
        ],
    },
    {
        "title": "Успешный вход и действия после него",
        "goal": "выяснить, удалось ли войти и что было сделано после входа.",
        "intro": [
            "sudo grep 'Accepted' /var/log/auth.log — все успешные входы (кто, откуда, когда)",
            "last — журнал сеансов: кто входил, с какого адреса, сколько длился сеанс",
            "sudo grep 'sudo:' /var/log/auth.log — команды, выполненные через sudo (COMMAND=...)",
            "ls -l ФАЙЛ — текущие права файла; getent group sudo — кто может выполнять команды от root",
        ],
        "items": [
            {"text": "Во сколько атакующий вошёл в систему? Ответ: answer 4.1 ЧЧ:ММ:СС", "kind": "answer",
             "qid": "4.1", "answer": lambda v, e: ans_time(e.p["login_time"])(v, e),
             "proof": lambda v, e: [e.p["login_time"]]},
            {"text": "Права какого файла изменили после входа? Ответ: answer 4.2 ПУТЬ", "kind": "answer",
             "qid": "4.2",
             "answer": lambda v, e: v.strip().strip("'\"") in (e.p["file"], e.p["file"].rsplit("/", 1)[-1])},
            {"text": "Какие права установили этому файлу? Ответ: answer 4.3 ЧИСЛО (например 644)", "kind": "answer",
             "qid": "4.3", "answer": lambda v, e: re.sub(r"^0", "", v.strip()) == e.p["bad_mode"]},
            {"text": "Членство в какой группе дало этой учётной записи права root через sudo? "
                     "Ответ: answer 4.4 ГРУППА", "kind": "answer", "qid": "4.4",
             "answer": ans_choice("sudo")},
        ],
    },
    {
        "title": "Временная шкала",
        "goal": "собрать в отдельные файлы все записи, относящиеся к инциденту, в исходном порядке.",
        "intro": [
            "mkdir -p ~/incident — каталог расследования (там уже лежит заготовка отчёта)",
            "sudo grep 'IP_АТАКУЮЩЕГО' /var/log/auth.log > ~/incident/timeline.txt — все события с адреса атакующего",
            "sudo grep 'sudo: *ИМЯ :' /var/log/auth.log > ~/incident/sudo.txt — команды, которые ИМЯ выполнил через sudo",
            "grep сохраняет порядок строк журнала — это и есть временная шкала; строки не редактируйте",
            "cat ~/incident/timeline.txt — проверьте: сначала серия Failed, затем Accepted, затем сеанс",
        ],
        "items": [
            {"text": "Запишите в ~/incident/timeline.txt все строки auth.log с IP-адресом атакующего", "kind": "fs",
             "check": lambda e: lines_of(e, e.h("incident/timeline.txt")) == e.p["timeline"],
             "why": lambda e: _why_timeline(e, "incident/timeline.txt", "timeline")},
            {"text": "Запишите в ~/incident/sudo.txt все строки auth.log о командах sudo этой учётной записи",
             "kind": "fs",
             "check": lambda e: lines_of(e, e.h("incident/sudo.txt")) == e.p["sudo_lines"],
             "why": lambda e: _why_timeline(e, "incident/sudo.txt", "sudo_lines")},
            {"text": "Исходный журнал /var/log/auth.log не изменён и не удалён", "kind": "fs", "critical": True,
             "check": _log_intact},
        ],
    },
    {
        "title": "Факты и гипотезы",
        "goal": "отделить то, что доказано журналами, от предположений.",
        "intro": [
            "Факт — то, что прямо записано в журнале (время, адрес, команда)",
            "Гипотеза — предположение, которое журналы не подтверждают (например, «данные украдены»)",
            "Неизвестное — то, для проверки чего нужны другие данные (сетевые журналы, история команд)",
            "Отвечайте да или нет — только по тому, что есть в журналах",
        ],
        "items": [
            {"text": "Был ли успешный вход с IP-адреса атакующего? Ответ: answer 6.1 да|нет", "kind": "answer",
             "qid": "6.1", "answer": ans_choice("да", "yes")},
            {"text": "Есть ли в журналах доказательство, что данные скопировали с сервера наружу? "
                     "Ответ: answer 6.2 да|нет", "kind": "answer", "qid": "6.2",
             "answer": ans_choice("нет", "no")},
            {"text": "Сколько неудачных попыток входа у учётной записи admin (это обычная опечатка, а не атака)? "
                     "Ответ: answer 6.3 ЧИСЛО", "kind": "answer", "qid": "6.3",
             "answer": lambda v, e: _norm(v) == str(e.p["admin_failed"]),
             "proof": lambda v, e: [str(e.p["admin_failed"])]},
        ],
    },
    {
        "title": "Сдерживание",
        "goal": "остановить злоумышленника соразмерными мерами, не уничтожая данные и журналы.",
        "intro": [
            "sudo passwd -l ИМЯ (или sudo usermod -L ИМЯ) — заблокировать скомпрометированную учётную запись; "
            "удалять её НЕЛЬЗЯ — это уничтожит данные для расследования",
            "sudo passwd -S ИМЯ — проверить: L значит «заблокирована»",
            "sudo gpasswd -d ИМЯ sudo — отозвать лишние права администратора; проверка: getent group sudo",
            "sudo chmod 640 ФАЙЛ — вернуть файлу прежние права (rw-r-----); проверка: ls -l ФАЙЛ",
            "НЕ блокируйте admin и свою учётную запись — сервер останется без администратора",
        ],
        "items": [
            {"text": "Заблокируйте учётную запись, к которой подобрали пароль", "kind": "fs",
             "check": lambda e: _locked(e, e.p["target"])},
            {"text": "Удалите её из группы sudo", "kind": "fs",
             "check": lambda e: not _in_sudo(e, e.p["target"])},
            {"text": "Верните файлу, права которого изменили, права 640", "kind": "fs",
             "check": lambda e: e.mode(e.p["file"].lstrip("/")) == 0o640},
            {"text": "Учётные записи admin и {user} не заблокированы и остаются в группе sudo", "kind": "fs",
             "critical": True, "check": _admins_ok},
            {"text": "Исходный журнал /var/log/auth.log не изменён и не удалён", "kind": "fs", "critical": True,
             "check": _log_intact},
        ],
    },
    {
        "title": "Отчёт об инциденте",
        "goal": "оформить результаты расследования.",
        "intro": [
            "cp ~/incident/report-template.txt ~/incident/report.txt — заготовка отчёта",
            "Заполните поля после двоеточия, например: sed -i 's/^Учётная запись:.*/Учётная запись: ИМЯ/' "
            "~/incident/report.txt",
            "или соберите отчёт заново: echo 'Учётная запись: ИМЯ' > ~/incident/report.txt, затем >> для остальных строк",
            "Время входа — ЧЧ:ММ:СС, файл — полный путь, меры — что вы сделали (через запятую)",
            "cat ~/incident/report.txt — проверьте результат",
        ],
        "items": [
            {"text": "Поле «Учётная запись:» — скомпрометированная учётная запись", "kind": "fs",
             "check": lambda e: _field(e, "Учётная запись", lambda v: _norm(v) == e.p["target"])},
            {"text": "Поле «IP-адрес:» — адрес атакующего", "kind": "fs",
             "check": lambda e: _field(e, "IP-адрес", lambda v: _norm(v) == e.p["attacker_ip"])},
            {"text": "Поле «Неудачных попыток:» — число неудачных попыток с этого адреса", "kind": "fs",
             "check": lambda e: _field(e, "Неудачных попыток", lambda v: _norm(v) == str(e.p["attack_failed"]))},
            {"text": "Поле «Время входа:» — время успешного входа", "kind": "fs",
             "check": lambda e: _field(e, "Время входа", lambda v: ans_time(e.p["login_time"])(v, e))},
            {"text": "Поле «Изменённый файл:» — полный путь файла", "kind": "fs",
             "check": lambda e: _field(e, "Изменённый файл", lambda v: v.strip() == e.p["file"])},
            {"text": "Поле «Меры:» — какие меры приняты (не пустое)", "kind": "fs",
             "check": lambda e: _field(e, "Меры", lambda v: len(v) >= 10)},
            {"text": "Исходный журнал /var/log/auth.log не изменён и не удалён", "kind": "fs", "critical": True,
             "check": _log_intact},
        ],
    },
]

INTRO = [
    "Вы — специалист первой линии реагирования. Ночью на сервере seclab сработало оповещение: много",
    "неудачных входов по SSH. Нужно по журналам выяснить, что произошло, сохранить доказательства,",
    "остановить злоумышленника и подготовить отчёт. Все данные учебные.",
    "",
    "Правила расследования: журналы не изменять и не удалять; не придумывать факты, которых нет в данных;",
    "не блокировать учётные записи без оснований; учётные записи не удалять.",
]

LAB = lab_task.register(lab_task.Lab("incident", 6, "Расследование инцидента по журналам", STAGES, INTRO,
                                     "incident"))

# Против решения «через нейросеть»: ответ засчитывается, если значение было в выводе команд студента,
# после каждого этапа — 2 контрольных вопроса (server/defense_banks.py).
LAB.track_output = True
LAB.defense = lab_task.bank_defense(STAGES, defense_banks.INCIDENT, defense_banks.INCIDENT_DECOYS)
