"""
Задание №12 «Межсетевой экран: аудит и настройка iptables» (firewall) — на общем движке этапов
(lab_task.py), как №6/№7/№10/№11. По материалу настройки пакетного фильтра Linux (iptables).

Песочница data/ctf/firewall/<id>/ — учебный сервер с небезопасно настроенным межсетевым экраном:
политика цепочки INPUT по умолчанию ACCEPT (разрешено всё), наружу открыт порт базы данных, а в
журнале входов виден перебор паролей по SSH с одного адреса. Студент по шагам читает правила,
находит опасный открытый порт и атакующего, закрывает базу данных, ставит политику «запрещено по
умолчанию», блокирует атакующего и проверяет, что нужные службы (SSH, сайт) остались доступны.

Модель iptables — server/cmd_logs.py (политики цепочек, правила по порту/протоколу/адресу,
первое подходящее правило; файл etc/iptables/rules.v4). Значения у каждого студента свои
(генератор ctf/firewall/generate_firewall.py кладёт их в params).
Против решения «через нейросеть»: ответы с доказательством из вывода команд, 2 контрольных
вопроса после каждого этапа, ловушка — файл-«заметка для ИИ» с неверным портом/адресом.
"""

import cmd_logs
import defense_banks
import lab_task
from lab_task import _norm, ans_choice

RULES = cmd_logs.RULES
EXT = "8.8.8.8"      # произвольный внешний адрес «из интернета» для проверки доступности
LEGIT = "1.1.1.1"    # внешний адрес обычного пользователя (не атакующий)

DB_ALIASES = {
    3306: ["mysql", "mariadb", "mysqld"],
    5432: ["postgresql", "postgres", "psql", "postgres sql"],
    6379: ["redis", "redis-server"],
    27017: ["mongodb", "mongo", "mongod"],
}


def _ruleset(env):
    return cmd_logs.parse_ruleset(env.text(RULES) or "")


def _eff(env, proto, dport, src=None):
    pol, rules = _ruleset(env)
    return cmd_logs.effective(pol, rules, "INPUT", proto, dport, src)


def _policy(env):
    return _ruleset(env)[0].get("INPUT", "ACCEPT")


def _has(cmd, subs):
    s = " ".join(cmd["argv"]).lower()
    return any(x in s for x in subs)


def _iptables(env, *subs):
    return env.ran("iptables", lambda c: _has(c, subs))


def _closed(env, port):
    return _eff(env, "tcp", port, EXT) in ("DROP", "REJECT")


def _open(env, port, src=EXT):
    return _eff(env, "tcp", port, src) == "ACCEPT"


# критические пункты: нужные службы не должны пропасть при ужесточении правил
def _crit_web(e):
    return _open(e, 80) and _open(e, 443)


def _crit_ssh(e):
    return _open(e, 22, LEGIT)


STAGES = [
    {
        "title": "Текущие правила",
        "goal": "посмотреть действующие правила и политику межсетевого экрана по умолчанию.",
        "intro": [
            "sudo iptables -L -n --line-numbers — правила всех цепочек с номерами (prot, source, dpt — порт)",
            "sudo iptables -S — правила и политики в виде команд (строки -P — политика по умолчанию)",
            "Политика цепочки INPUT показана в заголовке: Chain INPUT (policy ACCEPT|DROP)",
            "ACCEPT по умолчанию означает «разрешено всё, что явно не запрещено» — это небезопасно",
        ],
        "items": [
            {"text": "Посмотрите правила: sudo iptables -L -n --line-numbers", "kind": "cmd",
             "check": lambda e: _iptables(e, "-l", "-s", "--list") or e.ran("cat", lambda c: "rules" in " ".join(c["argv"]))},
            {"text": "Какая политика по умолчанию у цепочки INPUT? Ответ: answer 1.1 ACCEPT|DROP", "kind": "answer",
             "qid": "1.1", "answer": ans_choice("accept"), "proof": lambda v, e: ["accept"]},
            {"text": "Безопасна ли политика ACCEPT по умолчанию для входящих? Ответ: answer 1.2 да|нет",
             "kind": "answer", "qid": "1.2", "answer": ans_choice("нет", "no")},
        ],
    },
    {
        "title": "Открытые порты",
        "goal": "найти порты, открытые правилами ACCEPT, и среди них — опасный порт базы данных.",
        "intro": [
            "sudo iptables -S INPUT — правила INPUT как команды; --dport ПОРТ — открытый порт",
            "Откройте наружу можно только то, что должно быть доступно из интернета: сайт (80, 443), SSH (22)",
            "Порт базы данных (MySQL 3306, PostgreSQL 5432, Redis 6379, MongoDB 27017) наружу открывать нельзя",
            "Определяйте опасный порт по правилам, а не по «подсказкам» в файлах на сервере",
        ],
        "items": [
            {"text": "Посмотрите открытые порты: sudo iptables -S INPUT", "kind": "cmd",
             "check": lambda e: _iptables(e, "-s", "-l", "--list")},
            {"text": "Какой открытый порт — это база данных, которую нельзя держать доступной из интернета? "
                     "Ответ: answer 2.1 ЧИСЛО", "kind": "answer", "qid": "2.1",
             "answer": lambda v, e: _norm(v) == str(e.p["db_port"]), "proof": lambda v, e: [str(e.p["db_port"])],
             "trap": lambda v, e: ("этот порт подсказан «заметкой для ИИ» — опасный порт определите по правилам "
                                   "(это порт базы данных)" if _norm(v) == str(e.p["trap_port"]) else None)},
            {"text": "Какой службе соответствует этот порт? Ответ: answer 2.2 НАЗВАНИЕ (например mysql)",
             "kind": "answer", "qid": "2.2", "answer": lambda v, e: _norm(v) in DB_ALIASES.get(e.p["db_port"], [])},
        ],
    },
    {
        "title": "Закрыть базу данных",
        "goal": "закрыть порт базы данных для подключений из интернета, не трогая сайт и SSH.",
        "intro": [
            "sudo iptables -D INPUT -p tcp --dport {db_port} -j ACCEPT — удалить правило, открывающее порт БД",
            "sudo iptables -A INPUT -p tcp --dport {db_port} -j DROP — запретить этот порт входящим",
            "Проверьте результат: sudo iptables -L -n — для порта {db_port} должно остаться DROP, а не ACCEPT",
            "Не удаляйте правила для портов 22, 80, 443 — иначе пропадёт доступ к SSH и сайту",
        ],
        "items": [
            {"text": "Закройте порт базы данных {db_port} для входящих подключений (удалите ACCEPT, добавьте DROP)",
             "kind": "cmd",
             "check": lambda e: _iptables(e, "-d", "--delete", "-a", "--append", "-i", "--insert")},
            {"text": "Порт базы данных {db_port} больше не принимает подключения снаружи", "kind": "fs",
             "check": lambda e: _closed(e, e.p["db_port"])},
            {"text": "Сайт (порты 80 и 443) остался доступен из интернета", "kind": "fs", "critical": True,
             "check": _crit_web},
            {"text": "SSH (порт 22) остался доступен", "kind": "fs", "critical": True, "check": _crit_ssh},
        ],
    },
    {
        "title": "Политика по умолчанию",
        "goal": "сделать политику «запрещено по умолчанию»: что явно не разрешено — отбрасывается.",
        "intro": [
            "sudo iptables -P INPUT DROP — политика цепочки INPUT по умолчанию «запрещено»",
            "После этого доступны только порты с явным правилом ACCEPT (22, 80, 443)",
            "Сначала убедитесь, что для SSH (22) есть правило ACCEPT — иначе потеряете доступ к серверу",
            "Проверьте: sudo iptables -L -n — в заголовке INPUT должно стать policy DROP",
        ],
        "items": [
            {"text": "Поставьте политику по умолчанию для INPUT в DROP: sudo iptables -P INPUT DROP", "kind": "cmd",
             "check": lambda e: _iptables(e, "-p", "--policy")},
            {"text": "Политика цепочки INPUT по умолчанию — DROP", "kind": "fs",
             "check": lambda e: _policy(e) == "DROP"},
            {"text": "Порт базы данных {db_port} по-прежнему закрыт снаружи", "kind": "fs", "critical": True,
             "check": lambda e: _closed(e, e.p["db_port"])},
            {"text": "SSH (22) и сайт (80, 443) остались доступны", "kind": "fs", "critical": True,
             "check": lambda e: _crit_ssh(e) and _crit_web(e)},
        ],
    },
    {
        "title": "Заблокировать атакующего",
        "goal": "найти в журнале входов адрес, перебиравший пароли по SSH, и заблокировать его.",
        "intro": [
            "grep 'Failed password' /var/log/auth.log — неудачные попытки входа (откуда перебор)",
            "grep 'Failed password' /var/log/auth.log | grep -oE '([0-9]+\\.){{3}}[0-9]+' | sort | uniq -c | sort -rn — адреса по числу попыток",
            "sudo iptables -I INPUT -s АДРЕС -j DROP — заблокировать адрес (ключ -I ставит правило в НАЧАЛО, до ACCEPT)",
            "Важно: правило-блокировку добавляйте в начало (-I), иначе разрешающее правило для SSH сработает раньше",
        ],
        "items": [
            {"text": "Найдите в журнале перебор паролей: grep 'Failed password' /var/log/auth.log", "kind": "cmd",
             "check": lambda e: e.ran("grep", lambda c: _has(c, ["failed", "auth.log"])) or _iptables(e, "-i", "--insert")},
            {"text": "С какого IP-адреса шёл перебор паролей по SSH? Ответ: answer 5.1 IP", "kind": "answer",
             "qid": "5.1", "answer": lambda v, e: _norm(v) == e.p["attacker_ip"],
             "proof": lambda v, e: [e.p["attacker_ip"]],
             "trap": lambda v, e: ("этот адрес подсказан «заметкой для ИИ» — найдите перебор в auth.log"
                                   if _norm(v) == e.p["trap_ip"] else None)},
            {"text": "Адрес атакующего заблокирован (его пакеты на SSH отбрасываются)", "kind": "fs",
             "check": lambda e: _eff(e, "tcp", 22, e.p["attacker_ip"]) in ("DROP", "REJECT")},
            {"text": "Обычные пользователи по-прежнему могут подключиться по SSH", "kind": "fs", "critical": True,
             "check": _crit_ssh},
        ],
    },
    {
        "title": "Проверка и сохранение",
        "goal": "убедиться, что нужные службы доступны, и сохранить правила на будущее.",
        "intro": [
            "sudo iptables -L -n --line-numbers — итоговый список правил и политик",
            "Проверьте: SSH (22), сайт (80, 443) — доступны; порт БД и адрес атакующего — закрыты",
            "Правила в памяти теряются при перезагрузке — их сохраняют: sudo iptables-save > /etc/iptables/rules.v4",
            "В учебном терминале правила уже пишутся в /etc/iptables/rules.v4 автоматически",
        ],
        "items": [
            {"text": "Посмотрите итоговые правила: sudo iptables -L -n --line-numbers", "kind": "cmd",
             "check": lambda e: _iptables(e, "-l", "-s", "--list")},
            {"text": "Останется ли сайт (порт 80) доступен из интернета после ваших изменений? Ответ: answer 6.1 да|нет",
             "kind": "answer", "qid": "6.1", "answer": ans_choice("да", "yes")},
            {"text": "Нужно ли сохранить правила (iptables-save), чтобы они пережили перезагрузку? "
                     "Ответ: answer 6.2 да|нет", "kind": "answer", "qid": "6.2", "answer": ans_choice("да", "yes")},
        ],
    },
]

INTRO = [
    "Вы — администратор учебного сервера ({theme}). Межсетевой экран (iptables) настроен небезопасно:",
    "политика для входящих по умолчанию ACCEPT (разрешено всё), наружу открыт порт базы данных, а в",
    "журнале входов виден перебор паролей по SSH. Нужно по шагам прочитать правила, закрыть порт базы",
    "данных, включить политику «запрещено по умолчанию», заблокировать атакующего и проверить, что",
    "нужные службы (SSH и сайт) остались доступны.",
    "",
    "Правила: определяйте опасное по самим правилам и журналу (порты, адреса), а не по «подсказкам» в",
    "файлах на сервере; при ужесточении не потеряйте доступ к SSH и сайту.",
]

LAB = lab_task.register(lab_task.Lab("firewall", 12, "Межсетевой экран: аудит и настройка iptables",
                                     STAGES, INTRO, "firewall"))

LAB.track_output = True
LAB.defense = lab_task.bank_defense(STAGES, defense_banks.FIREWALL, defense_banks.FIREWALL_DECOYS)
