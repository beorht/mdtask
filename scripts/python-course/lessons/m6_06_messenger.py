DIR = 'm6/06-messenger'
THEORY = r'''
# Мини-проект «Сетевой мессенджер»

Итог курса — сервер чата: пользователи входят под своим именем, пишут в общий чат и друг другу, а история хранится в
базе.

## Чат на порту 7004

В учебной сети есть простой чат:

| Команда | Ответ |
| --- | --- |
| `SEND автор текст` | `OK` |
| `HISTORY` | история, по сообщению в строке «автор: текст», или `EMPTY` |

```python run modules=socket
import socket

with socket.socket() as sock:
    sock.connect(("10.0.0.5", 7004))
    for cmd in ["SEND Нигора Всем привет!", "SEND Тимур Привет)", "HISTORY"]:
        sock.sendall(cmd.encode("utf-8"))
        print(sock.recv(1024).decode("utf-8"))
```

## Сессия: кто пишет

В настоящем мессенджере не указывают автора в каждом сообщении — сначала **входят**, и сервер запоминает, кто это
соединение. Состояние «кто вошёл» хранится в переменной на время обработки **одного** клиента (внутри цикла по
`accept`), а общие данные — история, список пользователей — вне его.

```text
для каждого подключения:
    user ← None
    для каждой команды:
        LOGIN имя  → user ← имя
        если user нет → «ERROR: login first»
        …
```

## Протокол проекта

| Команда | Ответ |
| --- | --- |
| `LOGIN имя` | `WELCOME имя` |
| `SAY текст` | `OK` — сообщение в общий чат |
| `HISTORY` / `LAST n` | вся история / последние n сообщений, строки «имя: текст», или `EMPTY` |
| `TO имя текст` | `OK` — личное сообщение |
| `INBOX` | личные сообщения этому пользователю «от имя: текст» или `EMPTY` |
| `SEARCH слово` | сообщения общего чата со словом (без учёта регистра) или `NOT FOUND` |

Разбирать команды с текстом удобно `split(" ", 1)` или `split(" ", 2)`: текст сообщения может содержать пробелы.

## Хранение

История в SQLite (`messages: id, author, text, recipient`) — тогда её легко искать (`LIKE`) и выбирать последние
сообщения (`ORDER BY id DESC LIMIT ?`, затем развернуть).
'''
CL = lambda *cs: {'_edunet.json': '{"clients": ' + __import__('json').dumps([list(c) for c in cs], ensure_ascii=False) + '}\n'}
CORE = '''import socket
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE messages (id INTEGER PRIMARY KEY, author TEXT, text TEXT, recipient TEXT)")

def lines(rows, prefix=""):
    return "\\n".join(f"{prefix}{a}: {t}" for a, t in rows) or "EMPTY"

def handle(user, text):
    parts = text.split(" ", 1)
    cmd = parts[0]
    arg = parts[1] if len(parts) > 1 else ""
    if cmd == "LOGIN" and arg:
        return arg, f"WELCOME {arg}"
    if user is None:
        return user, "ERROR: login first"
    if cmd == "SAY" and arg:
        db.execute("INSERT INTO messages (author, text) VALUES (?, ?)", (user, arg))
        return user, "OK"
    if cmd == "HISTORY":
        return user, lines(db.execute("SELECT author, text FROM messages WHERE recipient IS NULL ORDER BY id"))
'''
EXTRA = '''    if cmd == "LAST" and arg.isdigit():
        rows = db.execute("SELECT author, text FROM messages WHERE recipient IS NULL ORDER BY id DESC LIMIT ?", (int(arg),)).fetchall()
        return user, lines(rows[::-1])
    if cmd == "TO":
        to = arg.split(" ", 1)
        if len(to) == 2:
            db.execute("INSERT INTO messages (author, text, recipient) VALUES (?, ?, ?)", (user, to[1], to[0]))
            return user, "OK"
    if cmd == "INBOX":
        return user, lines(db.execute("SELECT author, text FROM messages WHERE recipient = ? ORDER BY id", (user,)), "от ")
    if cmd == "SEARCH" and arg:
        rows = [r for r in db.execute("SELECT author, text FROM messages WHERE recipient IS NULL ORDER BY id") if arg.lower() in r[1].lower()]
        return user, lines(rows) if rows else "NOT FOUND"
'''
LOOP = '''    return user, "ERROR"

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    user = None
    while True:
        data = conn.recv(1024)
        if not data:
            break
        user, reply = handle(user, data.decode("utf-8"))
        conn.sendall(reply.encode("utf-8"))
    conn.close()
'''
TASKS = [
    {'id': 'msg-01', 'title': 'Клиент чата', 'statement': 'Подключитесь к чату ("192.168.1.10", 7004). Первая строка — ваше имя, дальше сообщения до «конец»: отправляйте каждое командой «SEND имя текст» (ответы не выводите). В конце запросите HISTORY и выведите ответ, а затем «Отправлено: k».',
     'solution': 'import socket\n\nwith socket.socket() as s:\n    s.connect(("192.168.1.10", 7004))\n    name = input()\n    sent = 0\n    while True:\n        text = input()\n        if text == "конец":\n            break\n        s.sendall(f"SEND {name} {text}".encode("utf-8"))\n        s.recv(1024)\n        sent += 1\n    s.sendall("HISTORY".encode("utf-8"))\n    print(s.recv(1024).decode("utf-8"))\nprint(f"Отправлено: {sent}")', 'inputs': [['Нигора', 'Всем привет!', 'Кто идёт на урок?', 'конец'], ['Тимур', 'конец']], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'msg-02', 'title': 'Вход и общий чат', 'statement': 'Сервер мессенджера с базой SQLite: «LOGIN имя» → «WELCOME имя», «SAY текст» → «OK» (сообщение в общий чат), «HISTORY» → строки «имя: текст» или «EMPTY». До входа на любую команду, кроме LOGIN, — «ERROR: login first». Неизвестная команда — «ERROR». Кто вошёл — запоминается для каждого подключения отдельно.',
     'solution': CORE + LOOP, 'inputs': [{'files': CL(['SAY привет', 'LOGIN Аня', 'SAY Всем привет!', 'HISTORY'], ['HISTORY', 'LOGIN Бек', 'SAY Привет, Аня', 'DANCE', 'HISTORY'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'msg-03', 'title': 'Последние сообщения', 'statement': 'Добавьте к прошлой задаче «LAST n» — последние n сообщений общего чата в обычном порядке (старое выше), или «EMPTY».',
     'solution': CORE + EXTRA.split('    if cmd == "TO":')[0] + LOOP, 'inputs': [{'files': CL(['LOGIN Аня', 'SAY 1', 'SAY 2', 'SAY 3', 'LAST 2', 'LAST 10'], ['LOGIN Бек', 'LAST 1', 'LAST x'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'msg-04', 'title': 'Личные сообщения', 'statement': 'Добавьте «TO имя текст» → «OK» (личное сообщение, в общий чат не попадает) и «INBOX» → личные сообщения вошедшему пользователю в виде «от имя: текст», или «EMPTY». LAST из прошлой задачи тоже оставьте.',
     'solution': CORE + EXTRA.split('    if cmd == "SEARCH"')[0] + LOOP, 'inputs': [{'files': CL(['LOGIN Аня', 'TO Бек Привет, Бек!', 'SAY Всем привет', 'INBOX'], ['LOGIN Бек', 'INBOX', 'HISTORY', 'TO Аня Взаимно'], ['LOGIN Аня', 'INBOX'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'msg-05', 'title': 'Поиск по чату', 'statement': 'Финальная версия: всё из прошлых задач и «SEARCH слово» — сообщения общего чата, где встречается слово (без учёта регистра), строками «имя: текст», или «NOT FOUND».',
     'solution': CORE + EXTRA + LOOP, 'inputs': [{'files': CL(['LOGIN Аня', 'SAY Завтра контрольная по Python', 'SAY Кто готов?', 'TO Бек python секрет'], ['LOGIN Бек', 'SEARCH PYTHON', 'SEARCH секрет', 'LAST 1', 'INBOX'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
]
