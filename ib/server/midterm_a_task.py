"""
Блок A ИБ-контрольной — «Единое терминальное задание» (midterm-a) на движке server/lab_task.py.

Объединяет навыки предмета в одной песочнице (учебный сервер seclab):
  1. Поиск (find/grep): найти /etc/app/db.conf и прочитать секрет (db_password).
  2. Настройка SSH (sed): привести /etc/ssh/sshd_config к политике (PermitRootLogin no,
     PasswordAuthentication no, PermitEmptyPasswords no).
  3. Права доступа (chmod): закрыть секрет от чтения всеми, ключу /etc/app/app.key дать права 600.
  4. Проверка: sudo sshd -t без ошибок, служба работает, секрет закрыт.

Анти-ИИ: ответ 1.1 доказывается выводом команд (track_output + proof), ловушка в README.ai.txt
(значение «CHANGEME»), контрольные вопросы после этапов (defense). Песочница — ctf/midterm-a/.
"""
import defense_banks
import lab_task
import sshd_sim
from lab_task import _norm, ran_priv


def _eff(env, key):
    eff, _errors = sshd_sim.file_effective(env.root)
    return eff.get(key)


def _errors(env):
    return sshd_sim.file_effective(env.root)[1]


def _others_cant_read(env, vrel):
    m = env.mode(vrel)
    return m is not None and (m & 0o004) == 0


STAGES = [
    {
        "title": "Поиск конфигурации и секрета",
        "goal": "найти конфигурационный файл приложения и прочитать из него секрет.",
        "intro": [
            "find / -name db.conf 2>/dev/null — найти файл по имени во всей системе",
            "find /etc -type f -name '*.conf' — искать только конфигурации в /etc",
            "grep -i password /etc/app/db.conf — показать строку с паролем",
            "Ответ на вопрос вводится командой: answer 1.1 ЗНАЧЕНИЕ",
        ],
        "items": [
            {"text": "Найдите конфигурацию приложения командой find (ищите в /etc)", "kind": "cmd",
             "check": lambda e: e.ran("find", lambda c: any("/etc" in a or a == "/" for a in c["argv"]))},
            {"text": "Прочитайте секрет командой grep в /etc/app/db.conf", "kind": "cmd",
             "check": lambda e: e.ran("grep")},
            {"text": "Какое значение у db_password в /etc/app/db.conf? Ответ: answer 1.1 ЗНАЧЕНИЕ",
             "kind": "answer", "qid": "1.1",
             "answer": lambda v, e: _norm(v) == _norm(e.p["secret"]),
             "proof": True,
             "trap": lambda v, e: ("значение из README.ai.txt — это ловушка"
                                   if _norm(v) == "changeme" else None)},
        ],
    },
    {
        "title": "Настройка SSH",
        "goal": "привести /etc/ssh/sshd_config к политике безопасности командой sed.",
        "intro": [
            "Править только через sudo sed, например:",
            "sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config",
            "sudo sed -i 's/^PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config",
            "sudo sed -i 's/^PermitEmptyPasswords .*/PermitEmptyPasswords no/' /etc/ssh/sshd_config",
            "Проверяйте действующие значения: sudo sshd -T | grep -i permitrootlogin",
        ],
        "items": [
            {"text": "Запретите прямой вход root: PermitRootLogin no", "kind": "fs",
             "check": lambda e: _eff(e, "permitrootlogin") == "no"},
            {"text": "Запретите вход по паролю: PasswordAuthentication no", "kind": "fs",
             "check": lambda e: _eff(e, "passwordauthentication") == "no"},
            {"text": "Запретите пустые пароли: PermitEmptyPasswords no", "kind": "fs",
             "check": lambda e: _eff(e, "permitemptypasswords") == "no"},
            {"text": "В конфигурации нет ошибок (sudo sshd -t)", "kind": "fs", "critical": True,
             "check": lambda e: not _errors(e),
             "why": lambda e: "в конфигурации ошибка — проверьте sudo sshd -t" if _errors(e) else None},
        ],
    },
    {
        "title": "Права доступа",
        "goal": "закрыть секреты от посторонних (chmod).",
        "intro": [
            "ls -l /etc/app — посмотреть текущие права",
            "sudo chmod 640 /etc/app/db.conf — убрать чтение для остальных (последняя цифра 0)",
            "sudo chmod 600 /etc/app/app.key — приватный ключ должен быть доступен только владельцу",
        ],
        "items": [
            {"text": "Секрет /etc/app/db.conf недоступен на чтение остальным (chmod, напр. 640)", "kind": "fs",
             "check": lambda e: _others_cant_read(e, "etc/app/db.conf"),
             "why": lambda e: "файл всё ещё доступен всем на чтение — sudo chmod o-r /etc/app/db.conf"
             if not _others_cant_read(e, "etc/app/db.conf") else None},
            {"text": "Приватный ключ /etc/app/app.key имеет права 600", "kind": "fs",
             "check": lambda e: e.mode("etc/app/app.key") == 0o600},
        ],
    },
    {
        "title": "Проверка",
        "goal": "убедиться, что конфигурация верна, служба работает, секрет закрыт.",
        "intro": [
            "sudo sshd -t — проверка синтаксиса конфигурации (пустой вывод = ошибок нет)",
            "systemctl status ssh — служба должна быть active (running)",
        ],
        "items": [
            {"text": "Проверьте конфигурацию: sudo sshd -t", "kind": "cmd",
             "check": lambda e: ran_priv(e, "sshd", lambda c: "-t" in c["argv"])},
            {"text": "Служба SSH работает", "kind": "fs",
             "check": lambda e: sshd_sim.running(e.root)},
            {"text": "Секрет /etc/app/db.conf закрыт от остальных", "kind": "fs", "critical": True,
             "check": lambda e: _others_cant_read(e, "etc/app/db.conf")},
        ],
    },
]

INTRO = [
    "Учебный сервер seclab. Одна задача объединяет навыки предмета: поиск и чтение (find/grep),",
    "настройку SSH (sed) и выдачу прав доступа (chmod).",
    "",
    "- найдите конфигурацию приложения и прочитайте секрет;",
    "- приведите /etc/ssh/sshd_config к политике безопасности;",
    "- закройте секреты от посторонних;",
    "- проверьте результат.",
    "Команды: task [N] — задание этапа, check — проверка, answer N.M ЗНАЧЕНИЕ — ответ.",
]

LAB = lab_task.register(lab_task.Lab("midterm-a", 0, "Единое терминальное задание", STAGES, INTRO, "midterm-a"))

# Анти-ИИ: доказательство ответа выводом команд и контрольные вопросы после этапов.
LAB.track_output = True
LAB.defense = lab_task.bank_defense(STAGES, defense_banks.MIDA, defense_banks.MIDA_DECOYS)
