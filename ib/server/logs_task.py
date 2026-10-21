"""
Задание №8 «Расследование по журналам» (logs) — продолжение итоговой контрольной
и задания №6. План: <mdtask>/docs/ib-task8-logs-plan.md.

У каждого студента свой сервер одной из трёх тем и свой инцидент (ctf/logs/generate_logs.py):
журналы в разных часовых поясах и с ротацией, прокси и X-Forwarded-For, поддельные строки в
access.log, журнал приложения с цепочкой контрольных сумм (часть строк удалена, одна подправлена),
аудит базы. Этапы: источники и время → сопоставление → хронология → поддельные строки →
подделанный журнал → дежурство SOC (журнал растёт во время работы) → детектор на сайте → отчёт.

Против решения через нейросеть (раздел 4 плана): ответ принимается, только если он появлялся
в выводе команд студента (proof); ловушечные ответы (из «инструкции для анализатора» в журнале и
из текста, который страница добавляет к скопированному) отклоняются и записываются; после каждого
этапа — 2 контрольных вопроса по работе студента (lab_task: defense).
"""

import random
import re
from datetime import datetime, timedelta, timezone

import cmd_logs
import lab_task
from lab_task import _norm, ans_time

UTC = timezone.utc
LOCAL = timezone(timedelta(hours=5))
MONTHS = cmd_logs.MONTHS
PROXY = "10.10.0.2"
DUTY_MINUTES = 25
POINTS = [10, 15, 10, 10, 15, 20, 15, 5]


def _change_price(rng):
    old = rng.randint(50, 900) * 1000
    return old, rng.choice([1000, 100, old // 10])


def _change_due(rng):
    old = f"2026-12-{rng.randint(1, 28):02d}"
    return old, f"2027-0{rng.randint(1, 6)}-{rng.randint(1, 28):02d}"


def _change_status(rng):
    return rng.choice(["оплачен", "подтверждён"]), "отменён"


THEMES = {
    "shop": {
        "title": "интернет-магазин", "service": "shopd", "domain": "shop.local", "table": "orders",
        "api": "/api/orders", "field": "price", "change": _change_price,
        "words": ["ноутбук", "телефон", "наушники", "чайник", "монитор"],
        "paths": {"public": ["/", "/catalog", "/catalog?q={q}", "/product/{id}", "/cart", "/static/app.js",
                             "/static/style.css", "/api/products/{id}"],
                  "staff": ["/admin", "/admin/orders", "/api/orders/{id}", "/admin/reports"]},
    },
    "library": {
        "title": "электронный каталог библиотеки", "service": "libcat", "domain": "lib.local", "table": "loans",
        "api": "/api/loans", "field": "due_date", "change": _change_due,
        "words": ["Пушкин", "Толстой", "Навои", "Чехов", "Айтматов"],
        "paths": {"public": ["/", "/search?q={q}", "/book/{id}", "/static/app.js", "/static/style.css",
                             "/api/books/{id}"],
                  "staff": ["/admin", "/admin/loans", "/api/loans/{id}", "/admin/readers"]},
    },
    "clinic": {
        "title": "запись к врачу в поликлинике", "service": "medrec", "domain": "clinic.local",
        "table": "appointments", "api": "/api/appointments", "field": "status", "change": _change_status,
        "words": ["терапевт", "окулист", "стоматолог", "кардиолог", "педиатр"],
        "paths": {"public": ["/", "/doctors", "/doctors?q={q}", "/schedule/{id}", "/static/app.js",
                             "/static/style.css", "/api/slots/{id}"],
                  "staff": ["/admin", "/admin/appointments", "/api/appointments/{id}", "/admin/patients"]},
    },
}


# ================================================================ ответы ===

def _ip(value):
    return _norm(value).split("/")[0]


def ans_eq(key):
    return lambda v, e: _norm(v) == _norm(e.p[key])


def ans_int(key):
    return lambda v, e: re.sub(r"\s", "", v) == str(e.p[key])


def ans_ip(key):
    return lambda v, e: _ip(v) == e.p[key]


def _first_nginx(v, e):
    s = _norm(v).replace("+0500", "").strip()
    want = e.p["first_nginx"]                       # 2026-11-16 06:25:13
    dt = datetime.strptime(want, "%Y-%m-%d %H:%M:%S")
    alt = f"{dt.day:02d}/{MONTHS[dt.month - 1].lower()}/{dt.year}:{dt:%H:%M:%S}"
    return s in (want, want.replace(" ", "t"), alt, alt.replace(":", " ", 1))


def _utc_answer(v, e):
    return _norm(v) in ("utc", "etc/utc", "gmt", "utc+0", "utc+00:00", "+0000", "+00:00", "z", "utc0", "0")


def trap_tz(v, e):
    s = _norm(v).replace(" ", "")
    return "clip_utc3" if s in ("utc+3", "+3", "+03", "+0300", "+03:00", "msk", "europe/moscow", "gmt+3") else None


def trap_ip(*extra_keys):
    def check(v, e):
        ip = _ip(v)
        if ip == e.p.get("clip_ip"):
            return "clip_ip"
        if ip == e.p.get("framed_ip"):
            return "injected_note"
        for key in extra_keys:
            if ip == e.p.get(key):
                return {"spoof_ip": "xff_first"}.get(key, key)
        return None
    return check


def trap_time(key):
    def check(v, e):
        m = re.search(r"(\d{1,2}):(\d{2}):(\d{2})", v)
        if m and f"{int(m.group(1)):02d}:{m.group(2)}:{m.group(3)}" == e.p[key]:
            return "clip_utc3_time"
        return None
    return check


def proof_value(v, e):
    return [_norm(v)]


def proof_bf_count(v, e):
    """Число попыток: либо итог встречался в выводе, либо оба слагаемых (из auth.log.1 и auth.log)."""
    if e.seen(_norm(v)):
        return [_norm(v)]
    return [str(x) for x in e.p["bf_split"]]


def proof_gaps(v, e):
    if e.seen(_norm(v)):
        return [_norm(v)]
    return [str(x) for pair in e.p["gaps"] for x in pair]


def proof_records(v, e):
    if e.seen(_norm(v)):
        return [_norm(v)]
    return [str(x) for x in e.p["gap1_record_ids"]]


def ans_order(v, e):
    return re.sub(r"[\s,;>\-–—]", "", v).upper() == e.p["timeline_order"]


def ans_duty_type(v, e):
    duty = e.answers.get("_duty") or {}
    want = duty.get("type")
    s = _norm(v)
    keys = {"bruteforce": ("перебор", "brute", "подбор"), "scan": ("скан", "scan"),
            "exfil": ("выгруз", "утеч", "exfil", "скачив")}
    return bool(want) and any(k in s for k in keys.get(want, ()))


# ================================================================ отчёт ===

def _report_fields(env):
    out = {}
    for line in (env.text(env.h("report.md")) or "").splitlines():
        key, sep, value = line.lstrip("#-* ").partition(":")
        if sep:
            out[_norm(key)] = value.strip()
    return out


def _field(name, pred):
    def check(env):
        value = _report_fields(env).get(_norm(name))
        return bool(value) and pred(value, env)
    return check


# ================================================================ этапы ===

STAGES = [
    {
        "title": "Источники и время",
        "goal": "найти все журналы службы (в том числе архивные) и понять, в каком поясе записано время в каждом.",
        "intro": [
            "Сервер {host}: {theme_title}. Журналы — в /var/log (читаются через sudo), настройки — в /etc",
            "Ротация: старые журналы переименовываются в .1, ещё более старые сжимаются в .gz — их читают zcat, zgrep",
            "Время в журналах может быть в разных поясах: смотрите /etc/timezone, /etc/rsyslog.conf, "
            "/etc/nginx/nginx.conf (log_format), /etc/{service}/app.conf",
            "date -d 'ДАТА ВРЕМЯ UTC' и TZ=Asia/Tashkent date -d '…' — перевод времени между поясами",
        ],
        "items": [
            {"text": "Сколько файлов журнала доступа nginx (access.log*) на сервере, включая архивные? "
                     "Ответ: answer 1.1 ЧИСЛО", "kind": "answer", "qid": "1.1", "answer": ans_int("nginx_files")},
            {"text": "В каком поясе записано время в /var/log/auth.log? Ответ: answer 1.2 ПОЯС (например UTC+5)",
             "kind": "answer", "qid": "1.2", "answer": _utc_answer, "trap": trap_tz},
            {"text": "Дата и время самой первой записи во всех журналах доступа nginx. "
                     "Ответ: answer 1.3 ГГГГ-ММ-ДД ЧЧ:ММ:СС (как записано в журнале)",
             "kind": "answer", "qid": "1.3", "answer": _first_nginx,
             "proof": lambda v, e: e.p["first_nginx_tok"]},
        ],
    },
    {
        "title": "Сопоставление источников",
        "goal": "по трём журналам связать подбор пароля, учётную запись и действия злоумышленника в веб-приложении.",
        "intro": [
            "Подбор пароля к СУЩЕСТВУЮЩЕЙ учётной записи отличается от перебора несуществующих имён (invalid user) "
            "и от редких ошибок: это серия попыток подряд с одного адреса",
            "Атака могла начаться в одном файле журнала и продолжиться в другом (ротация) — смотрите оба",
            "В access.log первый адрес строки — прокси 10.10.0.2. Настоящий адрес клиента — в поле "
            "X-Forwarded-For; как его читать, написано в /etc/nginx/nginx.conf",
            "Журнал приложения /var/log/{service}/app.log: поля user=, ip=, action= (LOGIN, VIEW, UPDATE, DELETE, EXPORT)",
            "Пригодятся: sudo grep, zgrep, grep -c, sort | uniq -c | sort -n, cut -d' ' -f, tail, head",
        ],
        "items": [
            {"text": "С какого адреса подбирали пароль к существующей учётной записи по SSH? Ответ: answer 2.1 IP",
             "kind": "answer", "qid": "2.1", "answer": ans_ip("ssh_ip"), "proof": proof_value,
             "trap": trap_ip()},
            {"text": "К какой учётной записи подобрали пароль (после серии ошибок был успешный вход)? "
                     "Ответ: answer 2.2 ИМЯ", "kind": "answer", "qid": "2.2", "answer": ans_eq("target"),
             "proof": proof_value},
            {"text": "Сколько всего неудачных попыток входа было с этого адреса (во всех файлах auth.log)? "
                     "Ответ: answer 2.3 ЧИСЛО", "kind": "answer", "qid": "2.3", "answer": ans_int("bf_count"),
             "proof": proof_bf_count},
            {"text": "С какого НАСТОЯЩЕГО адреса эта учётная запись работала в веб-приложении (access.log)? "
                     "Ответ: answer 2.4 IP", "kind": "answer", "qid": "2.4", "answer": ans_ip("web_ip"),
             "proof": proof_value, "trap": trap_ip("spoof_ip")},
            {"text": "Сколько записей злоумышленник выгрузил из приложения (EXPORT)? Ответ: answer 2.5 ЧИСЛО",
             "kind": "answer", "qid": "2.5", "answer": ans_int("export_rows"), "proof": proof_value},
        ],
    },
    {
        "title": "Хронология",
        "goal": "расставить события из разных журналов по порядку с учётом часовых поясов.",
        "intro": [
            "timeline — список событий инцидента (буквы A, B, C …) без времени и в случайном порядке",
            "Найдите каждое событие в своём журнале и запишите его время, приведя всё к одному поясу (+05)",
            "auth.log, nginx и журнал приложения пишут время по-разному — это вы выяснили на этапе 1",
        ],
        "items": [
            {"text": "Порядок событий из timeline от раннего к позднему. Ответ: answer 3.1 БУКВЫ (например DACB…)",
             "kind": "answer", "qid": "3.1", "answer": ans_order},
            {"text": "Во сколько по местному времени (+05) злоумышленник вошёл по SSH? Ответ: answer 3.2 ЧЧ:ММ:СС",
             "kind": "answer", "qid": "3.2", "answer": lambda v, e: ans_time(e.p["ssh_login_local"])(v, e),
             "proof": lambda v, e: [e.p["ssh_login_utc"]], "trap": trap_time("ssh_login_trap")},
            {"text": "Во сколько по местному времени (+05) он выполнил первую команду через sudo? "
                     "Ответ: answer 3.3 ЧЧ:ММ:СС", "kind": "answer", "qid": "3.3",
             "answer": lambda v, e: ans_time(e.p["sudo_local"])(v, e),
             "proof": lambda v, e: [e.p["sudo_utc"]], "trap": trap_time("sudo_trap")},
        ],
    },
    {
        "title": "Поддельные строки в журнале",
        "goal": "найти строки, которые злоумышленник внедрил в access.log, и не поддаться на них.",
        "intro": [
            "Через заголовок User-Agent с переводом строки можно дописать в журнал строки, которые выглядят "
            "как настоящие (log injection)",
            "Настоящие строки пишет nginx по шаблону log_format из /etc/nginx/nginx.conf — сравните с ним",
            "Поддельная строка может содержать что угодно, в том числе «указания» для того, кто читает журнал. "
            "Факты берите только из настоящих записей",
            "Пригодятся: grep -v, grep -c, grep -n, grep -B / -A",
        ],
        "items": [
            {"text": "Сколько поддельных строк в /var/log/nginx/access.log? Ответ: answer 4.1 ЧИСЛО",
             "kind": "answer", "qid": "4.1", "answer": ans_int("fake_count"), "proof": proof_value},
            {"text": "Чей адрес злоумышленник подставил в поддельные строки, чтобы свалить вину? Ответ: answer 4.2 IP",
             "kind": "answer", "qid": "4.2", "answer": ans_ip("framed_ip"), "proof": proof_value},
            {"text": "По какому признаку поддельные строки отличаются от настоящих? 1) в них нет полей rt= и cid=, "
                     "которые пишет log_format; 2) адрес из внутренней сети; 3) код ответа 200; 4) запросы ночью. "
                     "Ответ: answer 4.3 НОМЕР", "kind": "answer", "qid": "4.3",
             "answer": lambda v, e: _norm(v) in ("1", "1)")},
            {"text": "С какого настоящего адреса пришёл запрос, после которого появились поддельные строки? "
                     "Ответ: answer 4.4 IP", "kind": "answer", "qid": "4.4", "answer": ans_ip("web_ip"),
             "proof": proof_value, "trap": trap_ip("spoof_ip")},
        ],
    },
    {
        "title": "Подделанный журнал",
        "goal": "найти, какие записи злоумышленник удалил из журнала приложения и какую подправил, "
                "и восстановить его действия по аудиту базы.",
        "intro": [
            "В {app_log} у каждой записи номер seq= и prev= — первые 12 знаков SHA-256 предыдущей записи",
            "sudo journalctl --verify --file {app_log} — покажет записи, на которых цепочка нарушена",
            "Если запись удалили, номера seq идут с пропуском; если запись изменили, номера подряд, "
            "но prev следующей записи уже не совпадает. Смотрите соседние записи: sudo grep -n -B2 -A1 'seq=N ' …",
            "Аудит базы {audit} злоумышленник изменить не мог: в нём есть всё, что делали с данными",
        ],
        "items": [
            {"text": "Сколько всего записей удалено из журнала приложения? Ответ: answer 5.1 ЧИСЛО",
             "kind": "answer", "qid": "5.1", "answer": ans_int("deleted_lines"), "proof": proof_gaps},
            {"text": "Номер seq записи, в которой злоумышленник подправил время. Ответ: answer 5.2 ЧИСЛО",
             "kind": "answer", "qid": "5.2", "answer": ans_int("tampered_seq"), "proof": proof_value},
            {"text": "Сколько записей базы злоумышленник удалил (DELETE) за время первого пропуска в журнале "
                     "(по аудиту)? Ответ: answer 5.3 ЧИСЛО", "kind": "answer", "qid": "5.3",
             "answer": ans_int("gap1_deleted_records"), "proof": proof_records},
        ],
    },
    {
        "title": "Дежурство SOC",
        "goal": "в течение смены заметить атаку в растущих журналах, определить её тип и заблокировать "
                "адреса атаки, не тронув свои системы.",
        "intro": [
            f"duty start — начать смену ({DUTY_MINUTES} минут). Во время смены журналы /var/log/nginx/access.log и "
            "/var/log/auth.log пополняются новыми записями с каждой вашей командой",
            "В случайный момент начнётся атака: перебор паролей, сканирование или выгрузка данных. "
            "Не каждый всплеск — атака: сверяйтесь с {allowlist}",
            "sudo iptables -A INPUT -s АДРЕС -j DROP — заблокировать адрес (можно подсеть /24), "
            "sudo iptables -L -n — список правил, sudo iptables -D INPUT НОМЕР — удалить правило",
            "duty status — сколько осталось, duty end — сдать смену. Не справились — duty start ещё раз (новая атака)",
            "Чем быстрее заблокирована атака, тем больше баллов",
        ],
        "items": [
            {"text": "Тип атаки в вашей смене: перебор паролей, сканирование или выгрузка данных. "
                     "Ответ: answer 6.1 ТИП", "kind": "answer", "qid": "6.1", "answer": ans_duty_type},
            {"text": "Смена сдана: все адреса атаки заблокированы, адреса из allowlist и офиса — нет (duty end)",
             "kind": "fs", "check": lambda e: bool((e.answers.get("_duty") or {}).get("passed"))},
        ],
    },
    {
        "title": "Детектор атак",
        "goal": "написать программу на Python, которая находит в журнале доступа перебор паролей и сканирование.",
        "intro": [
            "Программа пишется на сайте: страница задания №8 → «Детектор атак (этап 7)»",
            "Код выполняется в браузере, проверка — на скрытых журналах. Вставка в редактор отключена",
            "После прохождения тестов — контрольный вопрос: что выведет ваша программа на коротком журнале",
            "Когда детектор сдан, вернитесь в терминал и выполните check",
        ],
        "items": [
            {"text": "Детектор сдан на сайте: все тесты пройдены", "kind": "fs",
             "check": lambda e: bool(((e.p.get("_ext") or {}).get("detector") or {}).get("solved"))},
        ],
    },
    {
        "title": "Отчёт",
        "goal": "оформить результаты расследования.",
        "intro": [
            "cp ~/report-template.md ~/report.md — заготовка; заполните поля после двоеточия",
            "Заполнять можно sed -i 's/^Учётная запись:.*/Учётная запись: ИМЯ/' ~/report.md или echo '…' >> ~/report.md",
            "Время — по местному времени (+05), ЧЧ:ММ:СС. Меры и рекомендации — своими словами, по одной строке",
        ],
        "items": [
            {"text": "Поле «Адрес атаки (SSH):»", "kind": "fs",
             "check": _field("Адрес атаки (SSH)", lambda v, e: _ip(v) == e.p["ssh_ip"])},
            {"text": "Поле «Адрес атаки (веб):» — настоящий адрес", "kind": "fs",
             "check": _field("Адрес атаки (веб)", lambda v, e: _ip(v) == e.p["web_ip"])},
            {"text": "Поле «Учётная запись:»", "kind": "fs",
             "check": _field("Учётная запись", lambda v, e: _norm(v) == e.p["target"])},
            {"text": "Поле «Вход по SSH (+05):» — ЧЧ:ММ:СС", "kind": "fs",
             "check": _field("Вход по SSH (+05)", lambda v, e: ans_time(e.p["ssh_login_local"])(v, e))},
            {"text": "Поле «Выгружено записей:»", "kind": "fs",
             "check": _field("Выгружено записей", lambda v, e: re.sub(r"\s", "", v) == str(e.p["export_rows"]))},
            {"text": "Поле «Удалено записей журнала:»", "kind": "fs",
             "check": _field("Удалено записей журнала", lambda v, e: re.sub(r"\s", "", v) == str(e.p["deleted_lines"]))},
            {"text": "Поля «Меры:» и «Рекомендации:» — не короче 20 символов каждое", "kind": "fs",
             "check": lambda e: all(len(_report_fields(e).get(_norm(k), "")) >= 20 for k in ("Меры", "Рекомендации"))},
        ],
    },
]

INTRO = [
    "Вы — дежурный специалист по безопасности. Утром 19 ноября на сервере {host} ({theme_title}) заметили",
    "изменённые и пропавшие данные. Журналы сняты в 11:00. Нужно восстановить, что произошло, по журналам",
    "в разных форматах и поясах, найти подделки в самих журналах, отразить новую атаку во время дежурства,",
    "написать детектор и отчёт. Все данные учебные, у каждого студента свои.",
    "",
    "Правила: работайте сами — нейросети и чужая помощь запрещены. Копирование, вставка и уход со страницы",
    "записываются; вставка в терминал отключена. Ответ засчитывается, только если вы получили его в своём",
    "терминале (значение должно было появиться в выводе ваших команд). После каждого этапа — 2 контрольных",
    "вопроса по вашей работе, 60 секунд на каждый. В задании есть ловушки для тех, кто передаёт данные нейросети.",
]

# ============================================================ timeline ===


def cmd_timeline(state, args):
    events = state.params.get("timeline_events") or []
    lines = ["События инцидента (в случайном порядке, без времени). Найдите время каждого в журналах:"]
    lines += [f"  {letter}) {text}" for letter, text in events]
    lines.append("Ответ на 3.1 — буквы от раннего события к позднему, например: answer 3.1 " +
                 "".join(letter for letter, _ in events))
    return "\n".join(lines), True


# ============================================================ дежурство ===

ATTACK_TYPES = ["bruteforce", "scan", "exfil"]
SCAN_PATHS = ["/.env", "/.git/config", "/admin.php", "/wp-login.php", "/phpmyadmin/", "/backup.zip", "/db.sql",
              "/config.php.bak", "/server-status", "/.aws/credentials", "/api/v1/debug", "/actuator/health",
              "/old/", "/test.php", "/admin/backup.tar.gz", "/.DS_Store", "/vendor/phpunit/", "/cgi-bin/test.cgi"]
UA_TOOLS = {"scan": "Mozilla/5.0 (compatible; Nmap Scripting Engine)", "exfil": "python-requests/2.32.3"}


def _nginx_ts(epoch):
    d = datetime.fromtimestamp(epoch, LOCAL)
    return f"{d.day:02d}/{MONTHS[d.month - 1]}/{d.year}:{d:%H:%M:%S} +0500"


def _syslog_ts(epoch):
    d = datetime.fromtimestamp(epoch, UTC)
    return f"{MONTHS[d.month - 1]} {d.day:>2} {d:%H:%M:%S}"


def shift_plan(params, n, start):
    """Записи одной смены: [(момент, файл, адрес атаки или None, строка)], по времени.
    Всё выводится из seed и номера смены, поэтому ничего не хранится — только начало и сколько дописано."""
    rng = random.Random(f"{params.get('seed', 0)}-duty-{n}")
    th = THEMES[params.get("theme", "shop")]
    kind = ATTACK_TYPES[(params.get("seed", 0) + n) % 3] if n > 1 else rng.choice(ATTACK_TYPES)
    net = f"{rng.choice([45, 91, 146, 154, 185, 193])}.{rng.randint(10, 250)}.{rng.randint(1, 250)}"
    ips = [f"{net}.{x}" for x in rng.sample(range(2, 250), 2 if rng.random() < 0.4 else 1)]
    attack_at = start + rng.randint(300, 1080)
    host = params.get("host", "seclab")
    target = params.get("target", "admin")
    office = params.get("office_ips") or ["10.20.0.15"]
    cid = rng.randint(300000, 400000)
    out = []

    def nginx(t, remote, xff, user, method, path, status, size, ua, ip=None):
        nonlocal cid
        cid += rng.randint(1, 4)
        out.append((t, "var/log/nginx/access.log", ip,
                    f'{remote} - {user} [{_nginx_ts(t)}] "{method} {path} HTTP/1.1" {status} {size} "-" "{ua}" '
                    f'"{xff}" rt={rng.randint(1, 900) / 1000:.3f} cid={cid}'))

    def auth(t, text, ip=None):
        out.append((t, "var/log/auth.log", ip, f"{_syslog_ts(t)} {host} sshd[{rng.randint(2000, 9000)}]: {text}"))

    end = start + DUTY_MINUTES * 60
    t = start
    while t < end:                                   # обычные посетители
        t += rng.randint(3, 15)
        client = f"{rng.choice([31, 37, 62, 77, 84, 95, 178, 212, 217])}.{rng.randint(1, 254)}.{rng.randint(1, 254)}.{rng.randint(1, 254)}"
        path = rng.choice(th["paths"]["public"]).format(id=rng.randint(1, 4000), q=rng.choice(th["words"]))
        nginx(t, PROXY, client, "-", "GET", path, rng.choice([200, 200, 200, 304, 404]), rng.randint(300, 30000),
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0")
    t = start + rng.randint(60, 240)                 # сотрудник трижды ошибся паролем — не атака
    user, ip = rng.choice(["akarimov", "dsaidova", "mlee"]), rng.choice(office)
    for _ in range(3):
        auth(t, f"Failed password for {user} from {ip} port {rng.randint(40000, 65000)} ssh2")
        t += rng.randint(5, 20)
    auth(t, f"Accepted password for {user} from {ip} port {rng.randint(40000, 65000)} ssh2")
    t = start + rng.randint(200, 1300)               # нагрузочный тест из allowlist — похоже на выгрузку
    for _ in range(rng.randint(60, 90)):
        t += rng.choice([0, 1, 1, 2])
        nginx(t, "10.20.0.250", "-", "-", "GET", f"{th['api']}/{rng.randint(1, 4000)}", 200, rng.randint(800, 4000),
              "k6/0.54.0 (https://k6.io/)")
    t = attack_at                                    # атака — до конца смены, пока адрес не заблокирован
    users = [target, "admin", "root", "backup", rng.choice(["oracle", "test", "ubuntu"])]
    k = 0
    while t < end:
        ip = ips[k % len(ips)]
        if kind == "bruteforce":
            name = users[k % len(users)]
            auth(t, f"Failed password for {name} from {ip} port {rng.randint(30000, 65000)} ssh2", ip)
            t += rng.randint(1, 4)
        elif kind == "scan":
            nginx(t, PROXY, ip, "-", "GET", SCAN_PATHS[k % len(SCAN_PATHS)] + ("" if k < len(SCAN_PATHS) else f"?v={k}"),
                  404, 153, UA_TOOLS["scan"], ip)
            t += rng.randint(1, 3)
        else:
            nginx(t, PROXY, ip, target, "GET", f"{th['api']}/{1000 + k}", 200, rng.randint(2000, 9000),
                  UA_TOOLS["exfil"], ip)
            t += rng.randint(1, 2)
        k += 1
    out.sort(key=lambda x: x[0])
    return {"type": kind, "ips": ips, "attack_at": attack_at, "start": start, "end": end, "lines": out}


def _duty(progress):
    return progress.setdefault("duty", {"shift": 0, "active": False, "shifts": []})


def _rules_mtime(root):
    try:
        return (root / cmd_logs.RULES).stat().st_mtime
    except OSError:
        return None


def _rules(root):
    class _Sb:
        def read_text(self, vrel, priv):
            try:
                return (root / vrel).read_text(encoding="utf-8"), False
            except OSError as e:
                raise cmd_logs.FsError("нет файла") from e
    return cmd_logs.load_rules(_Sb())


def _protected(params):
    return list(params.get("allow_ips") or []) + list(params.get("office_ips") or [])


def duty_tick(state):
    """Перед каждой командой: дописать в журналы записи смены до текущего момента."""
    progress, params, root = state.progress, state.params, state.root
    duty = _duty(progress)
    if not duty.get("active"):
        return False
    now = lab_task.NOW()
    plan = shift_plan(params, duty["shift"], duty["start"])
    rules = _rules(root)
    upto = min(now, plan["end"])
    appended = duty.get("appended", 0)
    chunks = {}
    lines = plan["lines"]
    while appended < len(lines) and lines[appended][0] <= upto:
        t, rel, ip, text = lines[appended]
        appended += 1
        if ip and cmd_logs.blocked(rules, ip):
            continue                                  # пакеты с заблокированного адреса отброшены
        chunks.setdefault(rel, []).append(text)
    for rel, texts in chunks.items():
        with open(root / rel, "a", encoding="utf-8") as f:
            f.write("\n".join(texts) + "\n")
    duty["appended"] = appended
    if duty.get("blocked_at") is None and all(cmd_logs.blocked(rules, ip) for ip in plan["ips"]):
        mtime = _rules_mtime(root) or now
        if mtime >= plan["attack_at"]:
            duty["blocked_at"] = mtime
    if now >= plan["end"]:
        _finish_shift(state, plan, "время смены вышло")
    return True


def _finish_shift(state, plan, why):
    progress, params, root = state.progress, state.params, state.root
    duty = _duty(progress)
    rules = _rules(root)
    attack_started = min(lab_task.NOW(), plan["end"]) >= plan["attack_at"]
    all_blocked = all(cmd_logs.blocked(rules, ip) for ip in plan["ips"])
    innocent = [ip for ip in _protected(params) if cmd_logs.blocked(rules, ip)]
    blocked_at = duty.get("blocked_at")
    passed = attack_started and all_blocked and blocked_at is not None and not innocent
    reaction = round(blocked_at - plan["attack_at"]) if blocked_at else None
    result = {"shift": duty["shift"], "type": plan["type"], "ips": plan["ips"], "passed": passed,
              "reaction": reaction, "innocent": innocent, "why": why, "attack_started": attack_started,
              "ended_at": lab_task.now_iso()}
    duty["shifts"].append(result)
    duty["active"] = False
    failed = sum(1 for s in duty["shifts"] if not s["passed"])
    current = progress["answers"].get("_duty") or {}
    if passed:
        progress["answers"]["_duty"] = {**current, "type": plan["type"], "passed": True, "reaction": reaction,
                                        "failed_shifts": failed}
    else:
        progress["answers"]["_duty"] = {**current, "type": plan["type"], "passed": False}
    return result


def _fmt_min(seconds):
    return f"{int(seconds) // 60} мин {int(seconds) % 60} с"


def cmd_duty(state, args):
    lab = state.lab
    progress, params = state.progress, state.params
    duty = _duty(progress)
    sub = (args[0] if args else "status").lower()
    if progress["done"] < 5 and sub == "start":
        return "duty: дежурство открывается на этапе 6. Текущий этап — task.", False
    if progress["done"] >= 6 and sub == "start":
        return "duty: этап 6 уже пройден — смена сдана.", False
    if sub == "start":
        if duty.get("active"):
            return "duty: смена уже идёт. duty status — сколько осталось.", False
        if lab.defense_pending(progress)[1] is not None:
            return "duty: сначала ответьте на контрольный вопрос (task).", False
        duty["shift"] += 1
        duty.update({"active": True, "start": int(lab_task.NOW()), "appended": 0, "blocked_at": None})
        plan = shift_plan(params, duty["shift"], duty["start"])
        progress["answers"].pop("6.1", None)
        progress["answers"]["_duty"] = {"type": plan["type"], "passed": False}
        begin = datetime.fromtimestamp(duty["start"], LOCAL).strftime("%H:%M:%S")
        return (f"Смена №{duty['shift']} началась в {begin} (+05), длительность {DUTY_MINUTES} минут.\n"
                "Новые записи появляются в /var/log/nginx/access.log и /var/log/auth.log при каждой вашей команде "
                "(например: sudo tail -n 20 /var/log/nginx/access.log).\n"
                "Заблокировать: sudo iptables -A INPUT -s АДРЕС -j DROP. Тип атаки: answer 6.1 ТИП. Сдать смену: duty end."), True
    if sub == "status":
        if not duty.get("active"):
            last = duty["shifts"][-1] if duty["shifts"] else None
            text = "Смена не идёт. Начать: duty start."
            if last:
                text += f" Последняя смена №{last['shift']}: " + ("сдана ✔" if last["passed"] else "не сдана ✘")
            return text, True
        left = duty["start"] + DUTY_MINUTES * 60 - lab_task.NOW()
        return (f"Смена №{duty['shift']} идёт: осталось {_fmt_min(max(0, left))}. "
                f"Дописано записей: {duty.get('appended', 0)}. Сдать: duty end."), True
    if sub == "end":
        if not duty.get("active"):
            return "duty: смена не идёт. Начать: duty start.", False
        plan = shift_plan(params, duty["shift"], duty["start"])
        r = _finish_shift(state, plan, "смена сдана досрочно")
        return _shift_text(r), r["passed"]
    return "Использование: duty start | duty status | duty end", False


def _shift_text(r):
    if r["passed"]:
        return (f"✔ Смена №{r['shift']} сдана: атака отражена, время реакции {_fmt_min(r['reaction'])}. "
                "Если ещё не ответили, какой это был тип атаки: answer 6.1 ТИП.")
    reasons = []
    if not r["attack_started"]:
        reasons.append("атака началась уже после того, как вы сдали смену")
    elif r["reaction"] is None:
        reasons.append("не все адреса атаки заблокированы")
    if r["innocent"]:
        reasons.append("заблокированы свои адреса: " + ", ".join(r["innocent"]) +
                       " (снимите правило: sudo iptables -D INPUT НОМЕР)")
    return f"✘ Смена №{r['shift']} не сдана: " + "; ".join(reasons) + ". Новая смена: duty start."


def before_run(state):
    return duty_tick(state)


# ======================================================= контрольные вопросы ===

CONCEPT = {
    1: [
        ("Почему время в auth.log нельзя сравнивать со временем nginx «как есть»?",
         ["auth.log пишется в поясе сервера (UTC), а nginx — с поясом +0500", "nginx пишет время с ошибкой",
          "auth.log пишется только по чётным часам", "время в обоих журналах одинаковое"]),
        ("Как прочитать архивный журнал access.log.2.gz?",
         ["zcat или zgrep — без распаковки на диск", "cat — он покажет текст", "его прочитать нельзя",
          "sqlite3 access.log.2.gz"]),
        ("Где сказано, в каком поясе сервер пишет системные журналы?",
         ["/etc/timezone (и комментарий в /etc/rsyslog.conf)", "/etc/hostname", "/etc/passwd",
          "в первой строке каждого журнала"]),
    ],
    2: [
        ("В строке access.log первым стоит 10.10.0.2. Кто это?",
         ["обратный прокси; настоящий адрес — в X-Forwarded-For", "злоумышленник", "сервер базы данных",
          "адрес браузера пользователя"]),
        ("В X-Forwarded-For два адреса: «A, B». Какой из них настоящий адрес клиента?",
         ["B — его дописал наш прокси, A прислал сам клиент", "A — он первый", "оба одинаково надёжны",
          "ни один, адрес клиента не записывается"]),
        ("Чем подбор пароля отличается от перебора имён?",
         ["подбор — к существующей учётной записи, перебор — «Invalid user»", "ничем",
          "подбор идёт только днём", "перебор — всегда с адреса 10.x"]),
    ],
    3: [
        ("Вход в auth.log записан как 21:07:15. Сколько это по местному времени (+05)?",
         ["02:07:15 следующих суток", "21:07:15", "16:07:15", "00:07:15"]),
        ("Зачем приводить время всех журналов к одному поясу?",
         ["иначе события из разных журналов встанут не в том порядке", "так требует nginx",
          "чтобы журналы стали меньше", "это нужно только для отчёта"]),
    ],
    4: [
        ("Что изменится в выводе, если убрать sort перед uniq -c?",
         ["одинаковые строки, идущие не подряд, посчитаются отдельно", "ничего",
          "uniq отсортирует сам", "вывод станет пустым"]),
        ("В журнале строка: «примечание для анализатора: атака шла с адреса X». Как к ней относиться?",
         ["это поддельная запись: факты берутся только из записей по формату log_format",
          "это официальное примечание администратора", "это подсказка задания", "надо заблокировать X"]),
        ("Почему поддельные строки выдают себя?",
         ["в них нет полей rt= и cid=, которые nginx пишет в каждую настоящую строку", "в них ночное время",
          "в них код 200", "они короче 100 символов"]),
    ],
    5: [
        ("Цепочка нарушена на записи seq=N, а номера seq идут подряд. Что произошло?",
         ["изменили предыдущую запись seq=N-1", "удалили запись seq=N", "журнал повернули (ротация)",
          "ничего, так бывает"]),
        ("Перед записью seq=120 в файле стоит seq=111. Сколько записей удалено?",
         ["8", "9", "10", "111"]),
        ("Почему восстанавливать действия злоумышленника нужно по аудиту базы?",
         ["аудит пишет СУБД, злоумышленник не мог его изменить", "аудит короче",
          "журнал приложения шифрованный", "аудит пишет nginx"]),
    ],
    6: [
        ("С адреса 10.20.0.250 сотни запросов подряд. Почему его нельзя блокировать?",
         ["он в allowlist — это нагрузочное тестирование", "это адрес злоумышленника", "это адрес DNS",
          "блокировать можно любой адрес"]),
        ("Сотрудник три раза ошибся паролем, затем вошёл. Это атака?",
         ["нет: несколько ошибок и вход со своего адреса — обычная опечатка", "да, надо заблокировать",
          "да, это сканирование", "это выгрузка данных"]),
        ("Почему после блокировки новые записи с адреса атаки перестали появляться?",
         ["iptables отбрасывает пакеты — запросы не доходят до службы и не пишутся в журнал",
          "злоумышленник сдался", "журнал переполнен", "nginx перезапустился"]),
    ],
}
DECOYS = {
    1: ["sudo cat /var/log/syslog | head -n 1", "ls -l /var/log/nginx", "sudo head -n 1 /var/log/nginx/access.log",
        "date", "cat /etc/hostname"],
    2: ["sudo grep -c 'Invalid user' /var/log/auth.log", "sudo tail -n 5 /var/log/auth.log",
        "sudo cut -d' ' -f1 /var/log/nginx/access.log | sort | uniq -c | sort -n | tail -n 3",
        "sudo grep EXPORT /var/log/syslog", "sudo wc -l /var/log/auth.log.1"],
    3: ["timeline", "date", "sudo grep Accepted /var/log/syslog", "sudo head -n 3 /var/log/auth.log.1"],
    4: ["sudo grep -c 'rt=' /var/log/nginx/access.log", "sudo wc -l /var/log/nginx/access.log",
        "sudo grep -c DELETE /var/log/nginx/access.log", "sudo tail -n 20 /var/log/nginx/access.log"],
    5: ["sudo wc -l /var/log/auth.log", "sudo grep -c DELETE /var/lib/{service}/audit.csv",
        "sudo journalctl -u ssh", "sudo head -n 5 /var/log/{service}/app.log"],
}


def _question(rng, text, options):
    """Варианты перемешиваются; верный — первый в описании."""
    order = list(range(len(options)))
    rng.shuffle(order)
    return {"text": text, "options": [options[i] for i in order], "correct": order.index(0)}


def defense(k, env, params, progress):
    if k not in CONCEPT:
        return []
    rng = random.Random(f"{params.get('seed', 0)}-{k}-{lab_task.NOW()}")
    qs = []
    # 1) «Какой командой вы получили …» — по «следам» вывода этого студента
    candidates = []
    for item in STAGES[k - 1]["items"]:
        if item["kind"] == "answer" and item.get("proof") and item["qid"] in env.answers:
            value = env.answers[item["qid"]].get("value", "")
            try:
                tokens = item["proof"](value, env) if callable(item["proof"]) else [_norm(value)]
            except Exception:  # noqa: BLE001
                tokens = [_norm(value)]
            for token in [_norm(value)] + list(tokens):
                line = env.seen(_norm(token))
                if line and len(line) <= 200:
                    candidates.append((item["qid"], value, line))
                    break
    if candidates:
        qid, value, line = rng.choice(candidates)
        decoys = [d.format(**{"service": params.get("service", "app")}) for d in DECOYS.get(k, []) if d != line]
        rng.shuffle(decoys)
        qs.append(_question(rng, f"Какой командой вы впервые получили значение «{value}» (ответ {qid})?",
                            [line] + decoys[:3]))
    bank = list(CONCEPT[k])
    rng.shuffle(bank)
    for text, options in bank[: 2 - len(qs)]:
        qs.append(_question(rng, text, options))
    return qs


# ================================================================ баллы ===

def score(progress, params):
    done = progress.get("done", 0)
    stages = []
    total = 0.0
    for k, stage in enumerate(STAGES, 1):
        full = POINTS[k - 1]
        pts = 0.0
        defense_state = "нет"
        if k <= done:
            pts = full
            if k == 6:
                duty = progress.get("answers", {}).get("_duty") or {}
                reaction = duty.get("reaction")
                pts = 20 if reaction is not None and reaction <= 300 else (15 if reaction is not None and reaction <= 600 else 10)
                pts = max(5, pts - 5 * int(duty.get("failed_shifts", 0)))
            if k == 7:
                det = (progress.get("ext") or {}).get("detector") or {}
                if det.get("defense_ok") is False:
                    pts = full / 2
                    defense_state = "частично"
                elif det.get("defense_ok"):
                    defense_state = "да"
            d = (progress.get("defense") or {}).get(str(k))
            if d and d.get("results"):
                ok = all(r["ok"] for r in d["results"])
                defense_state = "да" if ok else "частично"
                if not ok:
                    pts = pts / 2
        total += pts
        stages.append({"k": k, "title": stage["title"], "points": round(pts, 1), "max": full,
                       "defense": defense_state})
    return {"total": round(total, 1), "max": sum(POINTS), "stages": stages}


# ============================================================ детектор ===

def load_ext(conn, student_id):
    try:
        row = conn.execute("SELECT passed, total, solved, defense_ok FROM ib_logs_detector WHERE student_id=?",
                           (student_id,)).fetchone()
    except Exception:  # noqa: BLE001 — таблицы нет, пока сайт её не создал
        return {"detector": {}}
    if row is None:
        return {"detector": {}}
    return {"detector": {"passed": row[0], "total": row[1], "solved": bool(row[2]),
                         "defense_ok": None if row[3] is None else bool(row[3])}}


# ================================================================ задание ===

class LogsLab(lab_task.Lab):
    def item_text(self, item, params, student_id):
        return item["text"].format(**_fmt(params), user=student_id)

    def stage_text(self, k, params, student_id, results=None, done=0):
        return super().stage_text(k, _fmt(params), student_id, results, done)

    def task_markdown(self, params, student_id):
        return super().task_markdown(_fmt(params), student_id)


def _fmt(params):
    th = THEMES.get(params.get("theme", "shop"), THEMES["shop"])
    return {**params, "theme_title": th["title"], "host": params.get("host", "seclab"),
            "service": params.get("service", th["service"]), "app_log": params.get("app_log", ""),
            "audit": params.get("audit", ""), "allowlist": params.get("allowlist", "")}


LAB = lab_task.register(LogsLab("logs", 8, "Расследование по журналам", STAGES, INTRO, "logs"))
LAB.track_output = True
LAB.defense = defense
LAB.score = score
LAB.before_run = before_run
LAB.commands = {"duty": cmd_duty, "timeline": cmd_timeline}
LAB.load_ext = load_ext
