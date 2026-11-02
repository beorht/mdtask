"""
Задание №11 «Поиск подозрительных процессов и автозапуска» (procs) — на общем движке этапов
(lab_task.py), как №6/№7/№10. По материалу базы знаний «Подозрительные процессы в Linux» (Blue Team).

Песочница data/ctf/procs/<id>/ — учебный сервер seclab, на котором завёлся посторонний процесс:
грузит CPU, слушает нестандартный порт, стучится на «командный центр» и переживает перезагрузку
(служба systemd + таймер + задание в /etc/cron.d). Есть лишняя учётная запись с UID 0 и чужой
SSH-ключ. Студент по шагам находит процесс, его файл, сеть, службу, автозапуск, учётки/ключи и
связывает события по времени; вывод — по совокупности, доказательства не уничтожать.

Модель процессов/сокетов — proc_model.py (var/lib/seclab/procs.json, /proc/<PID>/*), службы и
таймеры — systemd_model.py (unit-файлы + var/lib/seclab/units.json). Значения у каждого студента свои
(генератор ctf/procs/generate_procs.py кладёт их в params).
"""

import defense_banks
import lab_task
from lab_task import _norm, ans_choice, ans_time

AUTH = "var/log/auth.log"


def _ran_read_auth(env):
    def pred(c):
        return c.get("priv") and AUTH in env.targets(c)
    return any(env.ran(n, pred) for n in ("cat", "head", "tail", "less", "more", "grep", "wc"))


def _path_eq(value, full):
    v = value.strip().strip("'\"").rstrip("/")
    return v == full or v == full.rsplit("/", 1)[-1]


STAGES = [
    {
        "title": "Процессы",
        "goal": "найти процесс, который грузит систему, и понять, от кого он запущен.",
        "intro": [
            "ps aux --sort=-%cpu | head — процессы по убыванию загрузки CPU (USER, PID, %CPU, COMMAND)",
            "ps -p PID -o pid,ppid,user,lstart,etime,cmd — подробно об одном процессе по его PID",
            "Высокая нагрузка и незнакомый путь запуска (не из /usr/bin) — повод проверить процесс",
            "Определяйте подозрительный процесс по данным (PID, путь, нагрузка), а не по имени и подписям",
        ],
        "items": [
            {"text": "Посмотрите процессы по загрузке CPU: ps aux --sort=-%cpu", "kind": "cmd",
             "check": lambda e: e.ran("ps", lambda c: any(a.startswith("--sort") for a in c["argv"]) or "aux" in c["argv"])},
            {"text": "Какой PID у подозрительного процесса (самая высокая загрузка CPU)? Ответ: answer 1.1 ЧИСЛО",
             "kind": "answer", "qid": "1.1", "answer": lambda v, e: _norm(v) == str(e.p["pid"]),
             "proof": lambda v, e: [str(e.p["pid"])],
             "trap": lambda v, e: ("этот PID подсказан «заметкой для ИИ» — определите процесс по загрузке CPU (ps)"
                                   if _norm(v) == str(e.p["trap_pid"]) else None)},
            {"text": "От имени какого пользователя он запущен? Ответ: answer 1.2 ИМЯ", "kind": "answer",
             "qid": "1.2", "answer": lambda v, e: _norm(v) == _norm(e.p["proc_user"]), "proof": True},
        ],
    },
    {
        "title": "Исполняемый файл",
        "goal": "узнать, какой файл на самом деле выполняется этим процессом.",
        "intro": [
            "readlink -f /proc/{pid}/exe — путь к исполняемому файлу процесса {pid}",
            "ls -l и stat на этот файл — владелец, права, дата изменения",
            "cat /proc/{pid}/cmdline — с какими аргументами запущен",
            "Системные программы лежат в /usr/bin, /usr/sbin; запуск из /opt, /tmp или домашнего — повод проверить",
        ],
        "items": [
            {"text": "Посмотрите путь к файлу процесса: readlink -f /proc/{pid}/exe", "kind": "cmd",
             "check": lambda e: e.ran("readlink", lambda c: any(f"/proc/{e.p['pid']}/exe" in a or "/exe" in a for a in c["argv"]))},
            {"text": "Какой полный путь у исполняемого файла? Ответ: answer 2.1 ПУТЬ", "kind": "answer",
             "qid": "2.1", "answer": lambda v, e: _path_eq(v, e.p["exe"]),
             "proof": lambda v, e: [e.p["exe"].rsplit("/", 1)[-1]]},
            {"text": "В системном каталоге (/usr/bin, /usr/sbin) находится этот файл? Ответ: answer 2.2 да|нет",
             "kind": "answer", "qid": "2.2", "answer": ans_choice("нет", "no")},
        ],
    },
    {
        "title": "Сетевые соединения",
        "goal": "выяснить, какой порт слушает процесс и куда он подключается.",
        "intro": [
            "ss -lntup — слушающие TCP/UDP-сокеты с процессом (Local Address:Port и program)",
            "ss -tnp — установленные соединения (Peer Address:Port — куда подключились)",
            "Сопоставьте сокет с PID подозрительного процесса ({pid})",
            "Нестандартный слушающий порт и исходящее соединение на незнакомый адрес — признак бэкдора",
        ],
        "items": [
            {"text": "Посмотрите слушающие сокеты: ss -lntup", "kind": "cmd",
             "check": lambda e: e.ran("ss", lambda c: "l" in "".join(a for a in c["argv"] if a.startswith("-")))},
            {"text": "Какой порт слушает подозрительный процесс? Ответ: answer 3.1 ЧИСЛО", "kind": "answer",
             "qid": "3.1", "answer": lambda v, e: _norm(v) == str(e.p["port"])},
            {"text": "На какой IP-адрес («командный центр») у процесса установлено соединение? Ответ: answer 3.2 IP",
             "kind": "answer", "qid": "3.2", "answer": lambda v, e: _norm(v) == e.p["c2_ip"],
             "proof": lambda v, e: [e.p["c2_ip"]]},
        ],
    },
    {
        "title": "Служба systemd",
        "goal": "понять, какая служба запускает этот процесс.",
        "intro": [
            "systemctl list-units --type=service --state=running — работающие службы",
            "systemctl status ИМЯ.service и systemctl cat ИМЯ.service — состояние и ExecStart службы",
            "В ExecStart указан путь запускаемого файла — сравните с найденным на этапе 2",
            "Злоумышленник часто называет службу похоже на системную — проверяйте ExecStart, а не имя",
        ],
        "items": [
            {"text": "Посмотрите работающие службы: systemctl list-units --type=service --state=running", "kind": "cmd",
             "check": lambda e: e.ran("systemctl", lambda c: "list-units" in c["argv"] or "status" in c["argv"]
                                      or "cat" in c["argv"])},
            {"text": "Как называется подозрительная служба? Ответ: answer 4.1 ИМЯ.service", "kind": "answer",
             "qid": "4.1",
             "answer": lambda v, e: _norm(v).rstrip() in (_norm(e.p["service"]), _norm(e.p["service"]).replace(".service", "")),
             "proof": lambda v, e: [e.p["service"]],
             "trap": lambda v, e: ("службу подсказала «заметка для ИИ» — смотрите ExecStart (systemctl cat)"
                                   if _norm(v).replace(".service", "") == _norm(e.p["trap_service"]).replace(".service", "") else None)},
            {"text": "Какой файл запускает эта служба (её ExecStart)? Ответ: answer 4.2 ПУТЬ", "kind": "answer",
             "qid": "4.2", "answer": lambda v, e: _path_eq(v, e.p["exe"]), "proof": lambda v, e: [e.p["exe"].rsplit("/", 1)[-1]]},
        ],
    },
    {
        "title": "Автозапуск",
        "goal": "найти, чем ещё обеспечивается перезапуск после перезагрузки.",
        "intro": [
            "systemctl list-timers --all — таймеры systemd (какой и что запускает)",
            "ls -l /etc/cron.d/ и cat /etc/cron.d/* — системные задания cron",
            "crontab -l — задания cron текущего пользователя",
            "Один и тот же файл может запускаться и службой, и таймером, и из cron — ищите все способы",
        ],
        "items": [
            {"text": "Посмотрите таймеры: systemctl list-timers --all", "kind": "cmd",
             "check": lambda e: e.ran("systemctl", lambda c: "list-timers" in c["argv"])},
            {"text": "Посмотрите задания в /etc/cron.d", "kind": "cmd",
             "check": lambda e: e.ran("ls", lambda c: "cron.d" in " ".join(c["argv"]))
             or e.ran("cat", lambda c: "cron.d" in " ".join(c["argv"]))},
            {"text": "Как называется таймер, запускающий тот же файл? Ответ: answer 5.1 ИМЯ.timer", "kind": "answer",
             "qid": "5.1", "answer": lambda v, e: _norm(v).rstrip() in (_norm(e.p["timer"]), _norm(e.p["timer"]).replace(".timer", "")),
             "proof": lambda v, e: [e.p["timer"]]},
            {"text": "Прописан ли тот же файл ещё и в задании cron (/etc/cron.d)? Ответ: answer 5.2 да|нет",
             "kind": "answer", "qid": "5.2", "answer": ans_choice("да", "yes")},
        ],
    },
    {
        "title": "Учётные записи и ключи",
        "goal": "проверить, не оставил ли злоумышленник себе доступ.",
        "intro": [
            "getent passwd — все учётные записи; UID 0 — права root (законно только у root)",
            "getent passwd | grep ':0:0:' — учётные записи с UID 0",
            "ls -la ~/.ssh и cat ~/.ssh/authorized_keys — какие ключи пускают на вход",
            "Сверяйте с тем, что должно быть: лишний UID 0 и незнакомый ключ — следы доступа",
        ],
        "items": [
            {"text": "Посмотрите учётные записи: getent passwd", "kind": "cmd",
             "check": lambda e: e.ran("getent", lambda c: "passwd" in c["argv"])
             or e.ran("grep", lambda c: ":0:0" in " ".join(c["argv"]))},
            {"text": "Какая учётная запись, кроме root, имеет UID 0? Ответ: answer 6.1 ИМЯ", "kind": "answer",
             "qid": "6.1", "answer": lambda v, e: _norm(v) == _norm(e.p["rogue"]), "proof": True,
             "trap": lambda v, e: ("учётную запись подсказала «заметка для ИИ» — проверьте UID по getent passwd"
                                   if _norm(v) == _norm(e.p["trap_account"]) else None)},
            {"text": "Чей ключ (комментарий) добавлен в ~/.ssh/authorized_keys? Ответ: answer 6.2 КОММЕНТАРИЙ",
             "kind": "answer", "qid": "6.2", "answer": lambda v, e: _norm(v) == _norm(e.p["key_comment"]), "proof": True},
        ],
    },
    {
        "title": "Единая картина",
        "goal": "связать находки по времени и не уничтожить доказательства.",
        "intro": [
            "sudo grep 'Accepted' /var/log/auth.log — успешные входы по SSH (кто, откуда, когда)",
            "sudo tail -n 20 /var/log/auth.log — последние события; sudo grep 'sudo:' — действия через sudo",
            "Свяжите: вход злоумышленника → действия → появление службы/процесса → соединение",
            "При подтверждённой компрометации НЕ удаляйте файлы и НЕ перезагружайте сервер — сохраните доказательства",
        ],
        "items": [
            {"text": "Прочитайте журнал входов: sudo grep 'Accepted' /var/log/auth.log", "kind": "cmd",
             "check": _ran_read_auth},
            {"text": "Во сколько злоумышленник вошёл по SSH? Ответ: answer 7.1 ЧЧ:ММ:СС", "kind": "answer",
             "qid": "7.1", "answer": lambda v, e: ans_time(e.p["login_time"])(v, e),
             "proof": lambda v, e: [e.p["login_time"]]},
            {"text": "Нужно ли сразу удалить найденные файлы и перезагрузить сервер? Ответ: answer 7.2 да|нет",
             "kind": "answer", "qid": "7.2", "answer": ans_choice("нет", "no")},
        ],
    },
]

INTRO = [
    "Вы — дежурный специалист Blue Team на учебном сервере seclab ({theme}). Сервер стал заметно",
    "медленнее, появились незнакомые сетевые соединения, а один процесс запускается снова даже после",
    "перезагрузки. Нужно по шагам разобраться, что за процесс, какой файл он запускает, с кем",
    "соединяется, какая служба и какой автозапуск его держат, и не оставил ли злоумышленник себе доступ.",
    "",
    "Правила: определяйте подозрительное по данным (PID, путь, порт, UID), а не по именам и подписям;",
    "вывод делайте по совокупности признаков; доказательства не удаляйте, сервер не перезагружайте.",
]

LAB = lab_task.register(lab_task.Lab("procs", 11, "Поиск подозрительных процессов и автозапуска",
                                     STAGES, INTRO, "procs"))

# Против решения «через нейросеть»: ответы с доказательством из вывода команд, 2 контрольных вопроса
# после каждого этапа, ловушка — «заметка для ИИ» с неверным процессом/службой/учёткой.
LAB.track_output = True
LAB.defense = lab_task.bank_defense(STAGES, defense_banks.PROCS, defense_banks.PROCS_DECOYS)
