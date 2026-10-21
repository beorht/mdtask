"""
Задание №7 «Безопасный удалённый доступ по SSH» (ssh) — по сценарию «Миссия 3. Безопасный
удалённый доступ» (data/TermialEmulatorScenariy).

Песочница data/ctf/ssh/<id>/ — сервер с OpenSSH (модель службы — sshd_sim.py, команды — cmd_admin.py):
sshd слушает личный порт, разрешён вход root и по паролю, нет ограничения круга пользователей, а
PasswordAuthentication yes спрятан в /etc/ssh/sshd_config.d/ (он читается раньше основного файла).
Студент — администратор (группы sudo и sshadmins); есть стажёр intern (входить по SSH не должен)
и служебная deploy (в sshadmins, входить должен).

Этапы: аудит службы → пользователи → резервная копия (откат) → вход по ключу → ужесточение
конфигурации → проверка и применение → проверка доступа. Критично: администратор не теряет доступ.
"""

import hashlib

import defense_banks
import lab_task
import sshd_sim
from lab_task import _norm, lines_of, ran_priv

DROPIN = "etc/ssh/sshd_config.d/50-cloud-init.conf"


def _sha(env, vrel):
    data = env.read(vrel)
    return None if data is None else hashlib.sha256(data).hexdigest()


def _file_eff(env):
    eff, errors = sshd_sim.file_effective(env.root)
    return eff, errors


def _eff(env, key):
    return _file_eff(env)[0].get(key)


def _pub(env):
    return (env.text(env.h(".ssh/id_ed25519.pub")) or "").strip()


def _key_installed(env):
    blob = sshd_sim.pub_blob(_pub(env))
    for line in lines_of(env, env.h(".ssh/authorized_keys")) or []:
        if blob and sshd_sim.pub_blob(line) == blob:
            return True
    return False


def _modes_ok(env):
    return env.mode(env.h(".ssh")) == 0o700 and env.mode(env.h(".ssh/authorized_keys")) == 0o600


def _can(env, eff, user, keys=True, password=False):
    priv = env.text(env.h(".ssh/id_ed25519")) or ""
    client = [sshd_sim.derive_pub(priv)] if keys and priv else []
    ok, method, _ = sshd_sim.login(env.root, eff, user, client, keys, password)
    return ok


def _allowed(env, eff, user):
    """Пустит ли политика (AllowUsers/AllowGroups/Deny*) пользователя — без учёта способа входа."""
    ok, _, reason = sshd_sim.login(env.root, {**eff, "passwordauthentication": "yes", "pubkeyauthentication": "no",
                                              "permitrootlogin": "yes"}, user, [], False, True)
    return ok or "not allowed" not in reason


def _only_sshadmins(env):
    eff, errors = _file_eff(env)
    if errors:
        return False
    return (_allowed(env, eff, env.user) and _allowed(env, eff, "deploy")
            and not _allowed(env, eff, "intern"))


def _why_only(env):
    eff, errors = _file_eff(env)
    if errors:
        return "в конфигурации есть ошибки — sudo sshd -t"
    if not _allowed(env, eff, env.user) or not _allowed(env, eff, "deploy"):
        return "политика запрещает вход участникам sshadmins (проверьте AllowUsers/AllowGroups)"
    return "стажёр intern по-прежнему может подключаться"


def _why_password(env):
    _, origins, _ = sshd_sim.parse(env.root)
    where = origins.get("passwordauthentication")
    if where and _eff(env, "passwordauthentication") != "no":
        return f"действует значение из {where[0]} (строка {where[1]}): sshd берёт ПЕРВОЕ значение, " \
               "а файлы sshd_config.d/*.conf читаются раньше основного"
    return None


def _applied(env):
    """Служба запущена и работает с конфигурацией из файлов (после reload/restart)."""
    eff, errors = _file_eff(env)
    run = sshd_sim.running(env.root)
    return not errors and run is not None and run == eff


def _admin_access(env):
    run = sshd_sim.running(env.root)
    return run is not None and _can(env, run, env.user)


def _ssh_ok(env, user, method=None, ok=True):
    def pred(c):
        s = c.get("ssh")
        return bool(s) and s["user"] == user and s["ok"] == ok and (method is None or s["method"] == method)
    return env.ran("ssh", pred, ok_only=False)


def _ssh_password_denied(env):
    def pred(c):
        s = c.get("ssh")
        argv = " ".join(c["argv"]).lower()
        return bool(s) and s["user"] == env.user and not s["ok"] and (
            "pubkeyauthentication=no" in argv or "preferredauthentications=password" in argv)
    return env.ran("ssh", pred, ok_only=False)


def _bak(env, rel, key):
    return _sha(env, rel) == env.p["hashes"][key]


STAGES = [
    {
        "title": "Аудит службы SSH",
        "goal": "узнать, как сейчас настроен сервер SSH: порт, вход root, вход по паролю.",
        "intro": [
            "systemctl status ssh — работает ли служба и на каком порту она слушает",
            "Настройки: /etc/ssh/sshd_config, а в его начале строка Include /etc/ssh/sshd_config.d/*.conf",
            "sudo sshd -T — ДЕЙСТВУЮЩИЕ значения всех параметров (с учётом Include и значений по умолчанию)",
            "sudo sshd -T | grep -i -E '^(port|permitrootlogin|passwordauthentication)' — только нужные",
            "grep -rn PasswordAuthentication /etc/ssh/ — в каких файлах встречается параметр",
            "Внимание: /etc/ssh/ssh_config (без d) — настройки КЛИЕНТА, на сервер не влияют",
        ],
        "items": [
            {"text": "Посмотрите состояние службы: systemctl status ssh", "kind": "cmd",
             "check": lambda e: e.ran("systemctl", lambda c: "status" in c["argv"])},
            {"text": "Выведите действующие значения: sudo sshd -T", "kind": "cmd",
             "check": lambda e: ran_priv(e, "sshd", lambda c: "-T" in c["argv"])},
            {"text": "На каком порту работает sshd? Ответ: answer 1.1 ПОРТ", "kind": "answer", "qid": "1.1",
             "answer": lambda v, e: _norm(v) == str(e.p["port"]), "proof": lambda v, e: [str(e.p["port"])]},
            {"text": "Разрешён ли сейчас вход root? Значение PermitRootLogin: answer 1.2 ЗНАЧЕНИЕ", "kind": "answer",
             "qid": "1.2", "answer": lambda v, e: _norm(v) == "yes"},
            {"text": "В каком файле задано действующее значение PasswordAuthentication? "
                     "Ответ: answer 1.3 ПУТЬ", "kind": "answer", "qid": "1.3",
             "answer": lambda v, e: v.strip().strip("'\"").lstrip("/") in (DROPIN, DROPIN.rsplit("/", 1)[-1])},
        ],
    },
    {
        "title": "Учётные записи и группы",
        "goal": "понять, кто может входить на сервер и кому это действительно нужно.",
        "intro": [
            "getent passwd — все учётные записи; последнее поле — оболочка (/bin/bash — можно войти, "
            "/usr/sbin/nologin — нельзя)",
            "getent group sshadmins — группа тех, кому разрешён удалённый вход по политике компании",
            "id ИМЯ и groups ИМЯ — в каких группах пользователь",
            "Политика: по SSH входят только участники sshadmins, только по ключу, root напрямую не входит",
        ],
        "items": [
            {"text": "Посмотрите участников группы sshadmins: getent group sshadmins", "kind": "cmd",
             "check": lambda e: e.ran("getent", lambda c: "sshadmins" in c["argv"])
             or e.ran("grep", lambda c: "sshadmins" in " ".join(c["argv"]))},
            {"text": "Сколько пользователей в группе sshadmins? Ответ: answer 2.1 ЧИСЛО", "kind": "answer",
             "qid": "2.1", "answer": lambda v, e: _norm(v) == "2"},
            {"text": "У какой учётной записи (кроме root) есть оболочка /bin/bash, но нет права на удалённый "
                     "вход по политике? Ответ: answer 2.2 ИМЯ", "kind": "answer", "qid": "2.2",
             "answer": lambda v, e: _norm(v) == "intern", "proof": True},
        ],
    },
    {
        "title": "Резервная копия и план отката",
        "goal": "до изменений сохранить исходную конфигурацию, чтобы её можно было быстро вернуть.",
        "intro": [
            "sudo cp -r /etc/ssh /etc/ssh.bak — копия всего каталога настроек SSH",
            "ls -l /etc/ssh.bak /etc/ssh.bak/sshd_config.d — проверьте, что всё скопировалось",
            "Откат, если что-то пойдёт не так: sudo cp /etc/ssh.bak/sshd_config /etc/ssh/sshd_config, "
            "то же для sshd_config.d, затем sudo systemctl reload ssh",
            "Не закрывайте текущий сеанс, пока не проверили новый способ входа — это ваш путь восстановления",
        ],
        "items": [
            {"text": "Сохраните копию /etc/ssh/sshd_config в /etc/ssh.bak/sshd_config", "kind": "fs",
             "check": lambda e: _bak(e, "etc/ssh.bak/sshd_config", "sshd_config")},
            {"text": "Сохраните копию /etc/ssh/sshd_config.d/50-cloud-init.conf в /etc/ssh.bak/sshd_config.d/",
             "kind": "fs",
             "check": lambda e: _bak(e, "etc/ssh.bak/sshd_config.d/50-cloud-init.conf", "dropin")},
        ],
    },
    {
        "title": "Вход по ключу",
        "goal": "настроить и ПРОВЕРИТЬ вход по ключу до того, как отключать вход по паролю.",
        "intro": [
            "Ваша пара ключей: ~/.ssh/id_ed25519 (закрытый — никому не передавать) и ~/.ssh/id_ed25519.pub (открытый)",
            "cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys — разрешить вход этим ключом (>> — дописать!)",
            "chmod 700 ~/.ssh и chmod 600 ~/.ssh/authorized_keys — иначе sshd откажет (StrictModes): "
            "файлы ключей не должны быть доступны на запись другим",
            "ssh -p {port} -i ~/.ssh/id_ed25519 {user}@localhost — проверка входа по ключу",
            "Если вход не удался: sudo tail -n 5 /var/log/auth.log — сервер пишет туда причину отказа",
        ],
        "items": [
            {"text": "Добавьте свой открытый ключ в ~/.ssh/authorized_keys", "kind": "fs",
             "check": _key_installed},
            {"text": "Установите права: каталог ~/.ssh — 700, файл authorized_keys — 600", "kind": "fs",
             "check": _modes_ok},
            {"text": "Войдите по ключу: ssh -p {port} -i ~/.ssh/id_ed25519 {user}@localhost", "kind": "cmd",
             "check": lambda e: _ssh_ok(e, e.user, "publickey")},
        ],
    },
    {
        "title": "Ужесточение конфигурации",
        "goal": "привести sshd_config к политике безопасности.",
        "intro": [
            "Править можно только через sed с sudo, например: "
            "sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config",
            "Не забудьте про /etc/ssh/sshd_config.d/50-cloud-init.conf — его значение действует раньше "
            "основного файла (можно исправить в нём или удалить этот файл)",
            "Новый параметр — дописать строку: echo 'AllowGroups sshadmins' | sudo tee -a /etc/ssh/sshd_config",
            "Требования: PermitRootLogin no, PasswordAuthentication no, PermitEmptyPasswords no, "
            "MaxAuthTries не больше 3, входить могут только участники sshadmins (AllowGroups sshadmins)",
            "Проверяйте действующие значения после каждой правки: sudo sshd -T | grep -i ИМЯ_ПАРАМЕТРА",
        ],
        "items": [
            {"text": "Запретите прямой вход root: PermitRootLogin no", "kind": "fs",
             "check": lambda e: _eff(e, "permitrootlogin") == "no"},
            {"text": "Запретите вход по паролю: PasswordAuthentication no (действующее значение!)", "kind": "fs",
             "check": lambda e: _eff(e, "passwordauthentication") == "no", "why": _why_password},
            {"text": "Запретите пустые пароли: PermitEmptyPasswords no", "kind": "fs",
             "check": lambda e: _eff(e, "permitemptypasswords") == "no"},
            {"text": "Ограничьте число попыток: MaxAuthTries 3 (или меньше)", "kind": "fs",
             "check": lambda e: str(_eff(e, "maxauthtries")).isdigit() and 0 < int(_eff(e, "maxauthtries")) <= 3},
            {"text": "Разрешите вход только участникам группы sshadmins: AllowGroups sshadmins", "kind": "fs",
             "check": _only_sshadmins, "why": _why_only},
            {"text": "В конфигурации нет ошибок (то, что проверяет sudo sshd -t)", "kind": "fs",
             "check": lambda e: not _file_eff(e)[1]},
        ],
    },
    {
        "title": "Проверка и применение",
        "goal": "проверить конфигурацию и применить её, не потеряв доступ.",
        "intro": [
            "sudo sshd -t — проверка синтаксиса: если ничего не вывела, ошибок нет",
            "sudo systemctl reload ssh — применить: служба перечитает конфигурацию без разрыва соединений",
            "При ошибке в конфигурации reload не применит её, а restart ОСТАНОВИТ службу — и доступ будет "
            "потерян. Поэтому всегда сначала sshd -t, потом reload",
            "systemctl status ssh — убедитесь, что служба active (running)",
        ],
        "items": [
            {"text": "Проверьте конфигурацию: sudo sshd -t (без ошибок)", "kind": "cmd",
             "check": lambda e: ran_priv(e, "sshd", lambda c: "-t" in c["argv"])},
            {"text": "Примените её: sudo systemctl reload ssh", "kind": "cmd",
             "check": lambda e: ran_priv(e, "systemctl", lambda c: "reload" in c["argv"] or "restart" in c["argv"])},
            {"text": "Служба запущена и работает с новой конфигурацией", "kind": "fs", "check": _applied,
             "why": lambda e: None if sshd_sim.running(e.root) else "служба остановлена — sudo systemctl start ssh"},
            {"text": "Администратор {user} может войти по ключу (по работающей конфигурации)", "kind": "fs",
             "critical": True, "check": _admin_access},
        ],
    },
    {
        "title": "Проверка доступа",
        "goal": "доказать, что разрешённый вход работает, а запрещённые — нет.",
        "intro": [
            "ssh -p {port} -i ~/.ssh/id_ed25519 {user}@localhost — должно пустить (по ключу)",
            "ssh -p {port} -o PubkeyAuthentication=no {user}@localhost — вход по паролю должен быть запрещён",
            "ssh -p {port} root@localhost — должно быть отказано",
            "ssh -p {port} intern@localhost — должно быть отказано (intern не в sshadmins)",
            "Причины отказов: sudo tail -n 10 /var/log/auth.log",
        ],
        "items": [
            {"text": "Войдите по ключу под {user}", "kind": "cmd",
             "check": lambda e: _ssh_ok(e, e.user, "publickey")},
            {"text": "Убедитесь, что вход по паролю запрещён: ssh -p {port} -o PubkeyAuthentication=no {user}@localhost",
             "kind": "cmd", "check": _ssh_password_denied},
            {"text": "Убедитесь, что root не может войти: ssh -p {port} root@localhost", "kind": "cmd",
             "check": lambda e: _ssh_ok(e, "root", ok=False)},
            {"text": "Убедитесь, что intern не может войти: ssh -p {port} intern@localhost", "kind": "cmd",
             "check": lambda e: _ssh_ok(e, "intern", ok=False)},
            {"text": "Администратор {user} может войти по ключу (по работающей конфигурации)", "kind": "fs",
             "critical": True, "check": _admin_access},
        ],
    },
]

INTRO = [
    "Вы — администратор удалённого доступа учебного сервера seclab. Сейчас SSH настроен небезопасно:",
    "можно войти под root, вход по паролю разрешён, войти может любой пользователь с паролем.",
    "Нужно привести сервер к политике компании, не потеряв собственный доступ:",
    "",
    "- по SSH входят только участники группы sshadmins;",
    "- только по ключу, вход по паролю запрещён;",
    "- прямой вход root запрещён, пустые пароли запрещены, не больше 3 попыток входа за подключение;",
    "- перед изменениями — резервная копия, новый способ входа проверяется ДО отключения старого.",
]

LAB = lab_task.register(lab_task.Lab("ssh", 7, "Безопасный удалённый доступ по SSH", STAGES, INTRO, "ssh"))


# Против решения «через нейросеть»: доказательство ответа выводом команд и контрольные вопросы после этапов.
LAB.track_output = True
LAB.defense = lab_task.bank_defense(STAGES, defense_banks.SSH, defense_banks.SSH_DECOYS)
