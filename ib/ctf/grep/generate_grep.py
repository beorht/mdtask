#!/usr/bin/env python3
"""
№9. Генератор задания «Тренажёр grep».

У каждого студента — учебный сервер (data/ctf/grep/<id>/) и два скрытых проверочных набора
(data/ctf/grep-check/<id>/1/, /2/): те же пути и те же личные значения (учётная запись, служба, домен),
но другое содержимое. Крайние случаи, ради которых придуманы задачи (dkarimov2, 300.1.2.3, код 500
в размере ответа, закомментированный пароль …), есть в каждом наборе — с другими значениями и
в других местах. Команда студента засчитывается, если она даёт эталонный вывод на всех трёх
(server/grep_task.py), поэтому «подогнанная» под свои данные команда не проходит.

  python3 ctf/grep/generate_grep.py --group IB | --student ID [--force | --refresh-task]
"""

import os
import random
import shutil
import string
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import lab_gen  # noqa: E402
from lab_gen import Tree  # noqa: E402
import grep_task  # noqa: E402
from grep_task import LAB, THEMES  # noqa: E402

HIDDEN_SETS = (1, 2)

SURNAMES = ["karimov", "rakhimova", "usmonov", "aliyeva", "tursunov", "nazarova", "yusupov", "ergasheva",
            "saidov", "khodjaeva", "mirzaev", "sobirova", "abdullaev", "kasimova", "rashidov", "umarova",
            "ismoilov", "jurayeva", "valiev", "xolmatova", "nurmatov", "shukurova", "boboev", "qodirova"]
FIRST = "abdefgjklmnorsuz"

WORDS_RU = ["сервер", "журнал", "доступ", "пароль", "резервная", "копия", "служба", "проверка", "обновление",
            "сеть", "адрес", "отчёт", "заявка", "смена", "ключ", "порт", "диск", "база", "пользователь"]
REPEATS = [("сервер", "Сервер"), ("на", "на"), ("не", "не"), ("the", "the"), ("доступ", "доступ"),
           ("Нет", "нет"), ("очень", "очень"), ("проверить", "проверить")]
NEAR_REPEATS = [("дом", "домой"), ("ab", "abc"), ("пароль", "пароли"), ("по", "поводу"), ("сеть", "сети"),
                ("a", "an")]


def make_params(rng, student_id):
    theme = rng.choice(sorted(THEMES))
    th = THEMES[theme]
    emp = rng.choice(FIRST) + rng.choice(SURNAMES)
    num = rng.randint(10, 99)
    return {
        "theme": theme,
        "seed": rng.randint(1, 10 ** 9),
        "emp": emp,
        "svc": th["service"],
        "domain": f"{th['domain_base']}{num}.uz",
    }


# ================================================================ помощники ===

def ip_public(rng):
    first = rng.choice([31, 37, 45, 62, 77, 82, 91, 95, 109, 145, 178, 185, 188, 193, 194, 212, 213, 217])
    return f"{first}.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(1, 254)}"


def ip_office(rng):
    return f"10.{rng.randint(1, 40)}.{rng.randint(0, 255)}.{rng.randint(2, 254)}"


def syslog_ts(t):
    return f"{t.strftime('%b')} {t.day:2d} {t.strftime('%H:%M:%S')}"


def nginx_ts(t):
    return t.strftime("%d/%b/%Y:%H:%M:%S +0500")


def times(rng, start, end, n):
    span = int((end - start).total_seconds())
    return sorted(start + timedelta(seconds=rng.randint(0, span)) for _ in range(n))


def place(rng, base, extra):
    """Вставляет строки extra в случайные места списка base (порядок extra не важен)."""
    out = list(base)
    for line in extra:
        out.insert(rng.randint(0, len(out)), line)
    return out


def sha_tail(rng):
    return "".join(rng.choice(string.ascii_letters + string.digits + "+/") for _ in range(43))


# ================================================================ auth.log ===

def auth_log(rng, p):
    emp = p["emp"]
    others = rng.sample([f + s for f in FIRST for s in SURNAMES if f + s != emp], 4)
    similar = [emp + str(rng.randint(2, 9)), emp + "a", emp + "_old"]
    start = datetime(2026, 11, 17, 0, 0, 0)
    end = datetime(2026, 11, 19, 6, 0, 0)
    pid = rng.randint(1200, 4000)
    office = [ip_office(rng) for _ in range(5)]

    def ssh(t, text):
        nonlocal pid
        pid += rng.randint(1, 40)
        return t, f"{syslog_ts(t)} seclab sshd[{pid}]: {text}"

    events = []
    for t in times(rng, start, end, rng.randint(220, 300)):
        r = rng.random()
        ip = ip_public(rng)
        port = rng.randint(30000, 65000)
        if r < 0.28:
            events.append(ssh(t, f"Failed password for invalid user {rng.choice(['admin', 'test', 'oracle', 'ubuntu', 'pi', 'git', 'user'])} "
                                 f"from {ip} port {port} ssh2"))
        elif r < 0.45:
            events.append(ssh(t, f"Failed password for {rng.choice(others + ['root'])} from {ip} port {port} ssh2"))
        elif r < 0.52:
            events.append(ssh(t, f"Failed publickey for {rng.choice(others)} from {rng.choice(office)} port {port} ssh2: "
                                 f"RSA SHA256:{sha_tail(rng)}"))
        elif r < 0.62:
            u = rng.choice(others)
            events.append(ssh(t, f"Accepted publickey for {u} from {rng.choice(office)} port {port} ssh2: "
                                 f"ED25519 SHA256:{sha_tail(rng)}"))
        elif r < 0.72:
            events.append(ssh(t, f"pam_unix(sshd:session): session closed for user {rng.choice(others)}"))
        elif r < 0.82:
            events.append((t, f"{syslog_ts(t)} seclab CRON[{rng.randint(5000, 9000)}]: pam_unix(cron:session): "
                              "session opened for user root(uid=0) by (uid=0)"))
        elif r < 0.9:
            events.append(ssh(t, f"Connection closed by authenticating user root {ip} port {port} [preauth]"))
        else:
            events.append(ssh(t, f"Disconnected from invalid user {rng.choice(['admin', 'test', 'guest'])} {ip} port {port} [preauth]"))

    def at():
        return start + timedelta(seconds=rng.randint(3600, int((end - start).total_seconds()) - 3600))

    # своя учётная запись: входы, sudo, ошибки, вариант в другом регистре; похожие имена
    for _ in range(rng.randint(3, 5)):
        t = at()
        ip = rng.choice(office)
        port = rng.randint(30000, 65000)
        events.append(ssh(t, f"Accepted password for {emp} from {ip} port {port} ssh2"))
        events.append(ssh(t + timedelta(seconds=1), f"pam_unix(sshd:session): session opened for user {emp}(uid=1001) by (uid=0)"))
    for _ in range(rng.randint(2, 3)):
        t = at()
        events.append((t, f"{syslog_ts(t)} seclab sudo: {emp} : TTY=pts/{rng.randint(0, 3)} ; PWD=/home/{emp} ; "
                          f"USER=root ; COMMAND=/usr/bin/systemctl restart {p['svc']}"))
    for _ in range(rng.randint(1, 3)):
        events.append(ssh(at(), f"Failed password for {emp} from {rng.choice(office)} port {rng.randint(30000, 65000)} ssh2"))
    upper = rng.choice([emp.upper(), emp.capitalize(), emp[0].upper() + emp[1:].capitalize()])
    events.append(ssh(at(), f"Invalid user {upper} from {ip_public(rng)} port {rng.randint(30000, 65000)}"))
    events.append(ssh(at(), f"Failed password for invalid user {upper} from {ip_public(rng)} port {rng.randint(30000, 65000)} ssh2"))
    for s in similar:
        events.append(ssh(at(), f"Failed password for invalid user {s} from {ip_public(rng)} port {rng.randint(30000, 65000)} ssh2"))
    events.append(ssh(at(), f"Accepted publickey for {similar[0]} from {rng.choice(office)} port {rng.randint(30000, 65000)} ssh2: "
                            f"ED25519 SHA256:{sha_tail(rng)}"))
    # строчное «failed password» (смена пароля) и «message repeated» с Failed password
    t = at()
    events.append((t, f"{syslog_ts(t)} seclab passwd[{rng.randint(5000, 9000)}]: pam_unix(passwd:chauthtok): "
                      f"failed password change for user {rng.choice(others)}"))
    t = at()
    events.append(ssh(t, f"message repeated {rng.randint(2, 4)} times: [ Failed password for root from {ip_public(rng)} "
                         f"port {rng.randint(30000, 65000)} ssh2]"))
    events.sort(key=lambda e: e[0])

    # входы root: отдельные и два подряд (контексты перекрываются); rootadmin — другая учётная запись
    lines = [line for _, line in events]
    root_lines = []
    for _ in range(rng.randint(2, 3)):
        root_lines.append(f"Accepted {rng.choice(['password', 'publickey'])} for root from {rng.choice(office)} "
                          f"port {rng.randint(30000, 65000)} ssh2")
    for text in root_lines:
        i = rng.randint(5, len(lines) - 5)
        lines.insert(i, f"{lines[i - 1][:15]} seclab sshd[{rng.randint(4000, 9000)}]: {text}")
    i = rng.randint(10, len(lines) - 10)
    for text in (f"Accepted password for root from {rng.choice(office)} port {rng.randint(30000, 65000)} ssh2",
                 f"Accepted publickey for root from {rng.choice(office)} port {rng.randint(30000, 65000)} ssh2: "
                 f"ED25519 SHA256:{sha_tail(rng)}"):
        lines.insert(i, f"{lines[i - 1][:15]} seclab sshd[{rng.randint(4000, 9000)}]: {text}")
        i += 2
    i = rng.randint(10, len(lines) - 10)
    lines.insert(i, f"{lines[i - 1][:15]} seclab sshd[{rng.randint(4000, 9000)}]: Accepted password for rootadmin "
                    f"from {rng.choice(office)} port {rng.randint(30000, 65000)} ssh2")
    return "\n".join(lines) + "\n"


# ============================================================== access.log ===

PATHS = ["/", "/login", "/static/app.js", "/static/style.css", "/favicon.ico", "/api/items", "/api/items/{id}",
         "/search?q={q}", "/profile", "/logout", "/robots.txt"]
UAS = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0", "Mozilla/5.0 (X11; Linux x86_64) Firefox/132.0",
       "curl/8.5.0", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Safari/604.1", "python-requests/2.31"]


def access_log(rng, p):
    start = datetime(2026, 11, 18, 0, 0, 0)
    end = datetime(2026, 11, 19, 3, 0, 0)
    clients = [ip_public(rng) for _ in range(25)] + [ip_office(rng) for _ in range(6)]
    blocked = []
    while len(blocked) < rng.randint(5, 7):
        a, b, c = rng.randint(31, 220), rng.randint(0, 255), rng.randint(0, 255)
        blocked.append(f"{a}.{b}.{c}.{rng.randint(1, 9)}")
    near = blocked[0] + str(rng.randint(0, 9))          # 10.20.30.4 → 10.20.30.45
    near2 = blocked[1] + str(rng.randint(0, 9))
    dotted = "x".join(blocked[2].split("."))     # 10x20x30x4 — совпадёт с шаблоном, где точка — «любой символ»

    def line(t, ip, method, path, status, size, proto="HTTP/1.1", ua=None):
        return (f'{ip} - - [{nginx_ts(t)}] "{method} {path} {proto}" {status} {size} "-" '
                f'"{ua or rng.choice(UAS)}"')

    def rnd_path():
        return rng.choice(PATHS).format(id=rng.randint(1, 9999), q=rng.choice(["ключ", "test", "report", "a"]))

    out = []
    for t in times(rng, start, end, rng.randint(330, 420)):
        r = rng.random()
        status = 200 if r < 0.62 else (304 if r < 0.72 else (404 if r < 0.84 else (301 if r < 0.9 else 403)))
        size = rng.randint(100, 40000)
        if status == 200 and rng.random() < 0.08:
            size = rng.randint(500, 599)                 # размер ответа 5xx — не код ответа
        proto = "HTTP/2.0" if rng.random() < 0.25 else "HTTP/1.1"
        out.append((t, line(t, rng.choice(clients), rng.choice(["GET", "GET", "GET", "POST"]), rnd_path(), status,
                            size, proto)))
    extra_t = times(rng, start, end, 40)
    k = 0

    def nt():
        nonlocal k
        k += 1
        return extra_t[k - 1]

    # ошибки сервера, в т. ч. по HTTP/2.0
    for _ in range(rng.randint(6, 10)):
        t = nt()
        out.append((t, line(t, rng.choice(clients), "GET", rnd_path(), rng.choice([500, 502, 503, 504]),
                            rng.randint(150, 600), rng.choice(["HTTP/1.1", "HTTP/2.0"]))))
    t = nt()
    out.append((t, line(t, rng.choice(clients), "GET", rnd_path(), rng.choice([500, 502, 503]), rng.randint(150, 600),
                        "HTTP/2.0")))
    # 5xx в адресе и в размере, 404 на страницу ошибки
    for code in rng.sample([500, 502, 503, 504], 2):
        t = nt()
        out.append((t, line(t, rng.choice(clients), "GET", f"/api/items/{code}", 200, rng.randint(700, 5000))))
    t = nt()
    out.append((t, line(t, rng.choice(clients), "GET", f"/errors/{rng.choice([500, 503])}.html", 404, rng.randint(150, 400))))
    t = nt()
    out.append((t, line(t, rng.choice(clients), "GET", "/static/app.js", 200, rng.randint(500, 599))))
    # чёрный список: адреса, «почти такие же» адреса и запись с цифрами адреса через x
    for ip in blocked:
        for _ in range(rng.randint(1, 3)):
            t = nt()
            out.append((t, line(t, ip, rng.choice(["GET", "POST"]), rng.choice(["/login", "/wp-login.php", "/.env", "/admin"]),
                                rng.choice([401, 404, 403]), rng.randint(150, 500), ua="Mozilla/5.0 zgrab/0.x")))
    for ip in (near, near2):
        t = nt()
        out.append((t, line(t, ip, "GET", rnd_path(), 200, rng.randint(200, 9000))))
    t = nt()
    out.append((t, line(t, rng.choice(clients), "GET", f"/files/{dotted}.zip", 200, rng.randint(2000, 90000))))
    out.sort(key=lambda e: e[0])
    return "\n".join(x for _, x in out) + "\n", blocked


# ================================================================= app.log ===

ACTIONS = ["login", "logout", "view", "update", "export", "search", "upload", "settings"]


def app_log(rng, p):
    lines = []
    start = datetime(2026, 11, 17, 6, 0, 0)
    end = datetime(2026, 11, 19, 3, 0, 0)
    users = ["admin", p["emp"], "operator", "reports", "guest"]
    for t in times(rng, start, end, rng.randint(240, 320)):
        lvl = rng.choice(["INFO"] * 6 + ["WARN", "ERROR"])
        lines.append((t, f"{t:%Y-%m-%d %H:%M:%S} {lvl} [{p['svc']}] user={rng.choice(users)} "
                         f"action={rng.choice(ACTIONS)} id={rng.randint(1, 99999)}"))

    def add(t, text):
        lines.append((t, f"{t:%Y-%m-%d %H:%M:%S} {text}"))

    d18 = datetime(2026, 11, 18)
    add(d18 + timedelta(hours=20, minutes=59, seconds=59), f"INFO [{p['svc']}] user=operator action=shift_end")
    add(d18 + timedelta(hours=21), f"INFO [{p['svc']}] user=operator action=shift_start")
    add(d18 + timedelta(hours=23, minutes=59, seconds=59), f"WARN [{p['svc']}] user=reports action=export rows={rng.randint(100, 900)}")
    add(datetime(2026, 11, 19), f"INFO [{p['svc']}] daily rotation")
    for _ in range(rng.randint(2, 4)):
        add(d18 + timedelta(minutes=rng.randint(0, 59), seconds=rng.randint(0, 59)), f"INFO [{p['svc']}] backup started")
    add(datetime(2026, 11, 17, rng.randint(9, 17), rng.randint(0, 59)),
        f"INFO [{p['svc']}] report scheduled for 2026-11-18 2{rng.randint(1, 3)}:{rng.randint(10, 59)}")
    add(datetime(2026, 11, 17, 22, rng.randint(0, 59), rng.randint(0, 59)), f"INFO [{p['svc']}] user=admin action=login")
    add(datetime(2026, 11, 19, 21, rng.randint(0, 59), rng.randint(0, 59)), f"INFO [{p['svc']}] user=admin action=login")
    lines.sort(key=lambda e: e[0])
    return "\n".join(x for _, x in lines) + "\n"


# ================================================================== passwd ===

def passwd(rng, p):
    names = rng.sample([f + s for f in FIRST for s in SURNAMES if f + s != p["emp"]], 5)
    shells = ["/bin/bash", "/bin/bash", "/usr/bin/zsh", "/bin/sh"]
    rows = [
        "root:x:0:0:root:/root:/bin/bash",
        "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
        "bin:x:2:2:bin:/bin:/usr/sbin/nologin",
        "sys:x:3:3:sys:/dev:/usr/sbin/nologin",
        "sync:x:4:65534:sync:/bin:/bin/sync",
        "backup:x:34:34:backup:/var/backups:/usr/sbin/nologin",
        "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
        "systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin",
        "sshd:x:105:65534::/run/sshd:/usr/sbin/nologin",
        f"{p['svc']}:x:{rng.randint(110, 130)}:{rng.randint(110, 130)}:{p['svc']} service:/var/lib/{p['svc']}:/usr/sbin/nologin",
        f"deploy:x:{rng.randint(900, 997)}:{rng.randint(900, 997)}:deploy scripts:/home/deploy:/bin/bash",
        f"ci:x:{rng.randint(101, 140)}:{rng.randint(1001, 1099)}:CI runner:/var/lib/ci:/bin/bash",
        "nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin",
    ]
    uid = 1000
    people = [p["emp"]] + names
    rng.shuffle(people)
    for name in people:
        rows.append(f"{name}:x:{uid}:{uid}:{name.capitalize()}:/home/{name}:{rng.choice(shells)}")
        uid += 1
    rows.append(f"tester:x:{uid}:{uid}:nologin test account:/home/tester:/bin/bash")
    rows.append(f"olduser:x:{uid + 1}:{uid + 1}:former employee:/home/olduser:/bin/false")
    rows.append(f"locked{rng.randint(1, 9)}:x:{uid + 2}:{uid + 2}::/home/locked:/usr/sbin/nologin")
    rows.append(f"auditor:x:{rng.randint(10000, 20000)}:{rng.randint(10000, 20000)}:external audit:/home/auditor:/bin/bash")
    head, tail = rows[:9], rows[9:]
    rng.shuffle(tail)
    return "\n".join(head + tail) + "\n"


# ================================================================ configs ===

def configs(rng, p, t, base):
    svc = p["svc"]
    pw = lambda: "".join(rng.choice(string.ascii_letters + string.digits) for _ in range(rng.randint(8, 14)))  # noqa: E731
    valid = [lambda: f"password = {pw()}", lambda: f"password={pw()}", lambda: f"    password = '{pw()}'",
             lambda: f"\tpassword =  {pw()}"]
    invalid = [lambda: f"#password = {pw()}", lambda: f"  # password = {pw()}", lambda: "password =",
               lambda: "password =   ", lambda: f"db_password = {pw()}", lambda: f"password_hint = {pw()}"]

    # главная конфигурация (задача 3) — комментарии, пустые строки, строки из пробелов
    main = [f"# Главная конфигурация службы {svc}", "# Изменения — только через заявку", ""]
    body = [f"listen = 0.0.0.0:{rng.choice([8080, 8443, 9000, 7000])}",
            f"workers = {rng.randint(2, 16)}",
            f"log_level = {rng.choice(['info', 'warn', 'debug'])}   # уровень журнала",
            f"public_url = https://{p['domain']}/#/login",
            f"timeout = {rng.randint(10, 120)}",
            f"data_dir = /var/lib/{svc}",
            "[database]",
            "host = 127.0.0.1",
            f"name = {svc}_db"]
    noise = ["", "   ", "\t", "  # закомментировано при переезде", "    #old_setting = 1", "# ---", "",
             f"#listen = 0.0.0.0:{rng.randint(1000, 9999)}"]
    main_has_pw = rng.random() < 0.5
    lines = list(body)
    lines.append(valid[rng.randrange(len(valid))]() if main_has_pw else invalid[rng.randrange(2)]())
    lines = place(rng, lines, noise)
    t.f(f"{base}/{svc}.conf", "\n".join(main + lines) + "\n")

    # остальные файлы (задача 7): в каких есть настоящий пароль — случайно, но хотя бы в двух
    files = ["conf.d/database.conf", "conf.d/cache.conf", "conf.d/mail.conf", "conf.d/ldap.conf",
             "sites/main/site.conf", "sites/api/site.conf"]
    good = set(rng.sample(files, rng.randint(2, 3)))
    spaced_done = False
    for name in files:
        content = [f"# {name}", f"enabled = {rng.choice(['yes', 'no'])}", f"user = {svc}"]
        if name in good:
            fn = valid[0] if not spaced_done else rng.choice(valid)
            spaced_done = True
            content.append(fn())
        else:
            content.append(rng.choice(invalid)())
        rng.shuffle(content[1:])
        t.f(f"{base}/{name}", "\n".join(content) + "\n")
    t.f(f"{base}/backup/database.conf.bak", f"user = {svc}\npassword = {pw()}\n")
    t.f(f"{base}/database.conf.example", f"# пример\nuser = {svc}\npassword = CHANGE_ME\n")
    t.f(f"{base}/README", f"Пароль базы (password) задаётся в conf.d/database.conf.\n"
                          f"Резервные копии конфигурации — в backup/.\n")


# ================================================================== notes ===

def sentence(rng, n=None):
    words = rng.sample(WORDS_RU, n or rng.randint(3, 7))
    s = " ".join(words)
    return s[0].upper() + s[1:]


def bad_ip(rng):
    return rng.choice([
        f"{rng.randint(256, 999)}.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(0, 255)}",
        f"{rng.randint(1, 255)}.{rng.randint(0, 255)}.{rng.randint(256, 400)}.{rng.randint(0, 255)}",
    ])


def notes(rng, p):
    lines = [sentence(rng) + "." for _ in range(rng.randint(40, 60))]
    good = [ip_public(rng) for _ in range(rng.randint(3, 5))] + [ip_office(rng) for _ in range(2)]
    extra = []
    for ip in good[:-2]:
        extra.append(f"{sentence(rng, 3)} {ip} {rng.choice(WORDS_RU)}.")
    extra.append(f"Шлюз по умолчанию: {good[-2]}.")                        # адрес в конце предложения
    extra.append(f"{good[-1]} — {rng.choice(WORDS_RU)}")                     # в начале строки
    extra.append(f"Опечатка в заявке: {bad_ip(rng)} и {bad_ip(rng)}.")
    a, b, c = rng.randint(1, 9), rng.randint(10, 30), rng.randint(0, 9)
    extra.append(f"Версия агента v{a}.{b}.{c}.{rng.randint(1, 9)} установлена.")
    extra.append(f"Номер раздела {rng.randint(1, 9)}.{rng.randint(1, 9)}.{rng.randint(1, 9)}.{rng.randint(1, 9)}."
                 f"{rng.randint(1, 9)} в регламенте.")
    extra.append(f"Старый адрес с ведущими нулями: 192.168.0{rng.randint(10, 99)}.{rng.randint(1, 99)}.")
    # повторённые слова и «почти повторы»
    for w1, w2 in rng.sample(REPEATS, rng.randint(3, 5)):
        extra.append(f"{sentence(rng, 2)} {w1} {w2} {rng.choice(WORDS_RU)}.")
    extra.append(f"{rng.choice(['Сервер', 'Журнал'])} {rng.choice(['сервер', 'журнал'])} проверен.")   # иногда это повтор
    for w1, w2 in rng.sample(NEAR_REPEATS, 3):
        extra.append(f"{sentence(rng, 2)} {w1} {w2}.")
    return "\n".join(place(rng, lines, extra)) + "\n"


# =============================================================== contacts ===

def contacts(rng, p):
    dom = p["domain"]
    name, tld = dom.rsplit(".", 1)
    rows = []
    people = rng.sample(SURNAMES, 12)
    for s in people[:7]:
        rows.append(f"{s.capitalize()} — {rng.choice(FIRST)}.{s}@{dom}, тел. +998 {rng.randint(90, 99)} "
                    f"{rng.randint(100, 999)} {rng.randint(10, 99)} {rng.randint(10, 99)}")
    rows.append(f"Поддержка: <support@{dom}>; дежурный: duty-{rng.randint(1, 9)}+night@{dom}.")
    rows.append(f"{people[7].capitalize()} пишет с адреса {people[7].upper()}@{name.capitalize()}.{tld.upper()}")
    rows.append(f"Подрядчик: {people[8]}@gmail.com, {people[9]}@mail.ru")
    rows.append(f"Фишинг: {people[10]}@{dom}.secure-login.com и {people[11]}@{dom}bek.com")
    rows.append(f"Поддомен филиала: info@branch.{dom}")
    rows.append(f"Рассылка: news@{name}-mail.{tld} (не наш домен)")
    return "\n".join(place(rng, [f"# Контакты {p['svc']}"], rows)) + "\n"


# =============================================================== payments ===

def card(rng):
    digits = str(rng.choice([4, 5, 9])) + "".join(str(rng.randint(0, 9)) for _ in range(15))
    return [digits[i:i + 4] for i in range(0, 16, 4)]


def payments(rng, p):
    rows = []
    day = datetime(2026, 11, 18)
    for _ in range(rng.randint(14, 20)):
        t = day + timedelta(minutes=rng.randint(0, 1400))
        order = "".join(str(rng.randint(0, 9)) for _ in range(rng.randint(6, 9)))
        rows.append(f"{t:%Y-%m-%d %H:%M} заказ №{order} на сумму {rng.randint(10, 900) * 1000} сум оплачен")
    g = [card(rng) for _ in range(5)]
    extra = [
        f"оплата картой {' '.join(g[0])} принята",
        f"оплата картой {'-'.join(g[1])} принята",
        f"оплата картой {''.join(g[2])} принята",
        f"возврат на карту {' '.join(g[3])}.",
        f"ошибка ввода: {g[4][0]}-{g[4][1]} {g[4][2]}-{g[4][3]} (разные разделители)",
        f"заказ №{''.join(str(rng.randint(0, 9)) for _ in range(20))} создан",
        f"квитанция {''.join(str(rng.randint(0, 9)) for _ in range(15))} выдана",
        f"телефон клиента +998 {rng.randint(90, 99)} {rng.randint(100, 999)} {rng.randint(10, 99)} {rng.randint(10, 99)}",
    ]
    return "\n".join(place(rng, rows, extra)) + "\n"


# ================================================================== сборка ===

def write_set(root, student_id, p, rng, full):
    """Файлы задания в корень root. full — целая система (видимый набор), иначе только файлы задания."""
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    t = Tree(root)
    if full:
        lab_gen.base_system(t, student_id)
    else:
        for d in ("etc", "var/log", "srv", "home", f"home/{student_id}"):
            t.d(d)
    svc = p["svc"]
    t.d("var/log/nginx")
    t.d(f"var/log/{svc}")
    t.d(f"srv/{svc}")
    t.f("var/log/auth.log", auth_log(rng, p), 0o644)
    access, blocked = access_log(rng, p)
    t.f("var/log/nginx/access.log", access, 0o644)
    t.f(f"var/log/{svc}/app.log", app_log(rng, p), 0o644)
    t.f("etc/passwd", passwd(rng, p), 0o644)
    configs(rng, p, t, f"etc/{svc}")
    t.f(f"srv/{svc}/notes.txt", notes(rng, p), 0o644)
    t.f(f"srv/{svc}/contacts.txt", contacts(rng, p), 0o644)
    t.f(f"srv/{svc}/payments.txt", payments(rng, p), 0o644)
    t.f(f"srv/{svc}/blocklist.txt", "\n".join(blocked) + "\n", 0o644)
    t.finish()


def hidden_root(root, student_id):
    return Path(root).resolve().parent.parent / grep_task.CHECK_DIR / student_id


def build(root, student_id, params, rng):
    p = dict(params)
    write_set(root, student_id, p, random.Random(f"{p['seed']}-0"), True)
    hidden = hidden_root(root, student_id)
    if hidden.exists():
        shutil.rmtree(hidden)
    for n in HIDDEN_SETS:
        write_set(hidden / str(n), student_id, p, random.Random(f"{p['seed']}-{n}"), False)
    p["expect"] = grep_task.expectations(root, student_id, p)
    return p


if __name__ == "__main__":
    os.umask(0o022)
    lab_gen.main(LAB, make_params, build, "Задание №9: тренажёр grep", keep_keys=("theme", "seed", "emp", "svc", "domain"))
