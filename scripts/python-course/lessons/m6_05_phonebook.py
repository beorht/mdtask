DIR = 'm6/05-phonebook'
THEORY = r'''
# Сетевой телефонный справочник

Классическая клиент-серверная задача: справочник хранится на сервере, а пользователи с разных компьютеров
добавляют и ищут номера.

## Справочник на порту 7003

В учебной сети уже работает такой сервер:

| Команда | Ответ |
| --- | --- |
| `ADD имя телефон` | `OK` |
| `GET имя` | телефон или `NOT FOUND` |
| `LIST` | имена через запятую по алфавиту или `EMPTY` |
| другое | `ERROR` |

```python run modules=socket
import socket

def ask(sock, command):
    sock.sendall(command.encode("utf-8"))
    return sock.recv(1024).decode("utf-8")

with socket.socket() as sock:
    sock.connect(("10.0.0.5", 7003))
    print(ask(sock, "ADD Ойбек 901112233"))
    print(ask(sock, "GET Ойбек"))
    print(ask(sock, "GET Ноль"))
```

Функция «отправить команду и получить ответ» делает код клиента коротким: каждая операция — одна строка.

## Свой сервер справочника

Сначала — со словарём в памяти, затем — с базой SQLite, чтобы данные переживали перезапуск. Поиск по началу имени в
SQL: `WHERE name LIKE ?` с параметром `текст + "%"`.

## JSON-протокол

Текстовый протокол ломается, если в имени есть пробел. Тот же справочник можно сделать на JSON: запрос
`{"cmd": "add", "name": "Анна Ли", "phone": "…"}`, ответ `{"ok": true}` или `{"ok": false, "error": "…"}`.
'''
CL = lambda *cs: {'_edunet.json': '{"clients": ' + __import__('json').dumps([list(c) for c in cs], ensure_ascii=False) + '}\n'}
LOOP = '''
server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        conn.sendall(handle(data.decode("utf-8")).encode("utf-8"))
    conn.close()
'''
TASKS = [
    {'id': 'pb-01', 'title': 'Клиент справочника', 'statement': 'Подключитесь к справочнику ("192.168.1.10", 7003). Даны команды по одной до «конец» — отправляйте их и выводите «команда => ответ».',
     'solution': 'import socket\n\nwith socket.socket() as s:\n    s.connect(("192.168.1.10", 7003))\n    while True:\n        cmd = input()\n        if cmd == "конец":\n            break\n        s.sendall(cmd.encode("utf-8"))\n        print(f"{cmd} => {s.recv(1024).decode(\'utf-8\')}")', 'inputs': [['ADD Аня 901', 'ADD Бек 902', 'GET Аня', 'GET Ян', 'LIST', 'DEL Аня', 'конец'], ['LIST', 'конец']], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'pb-02', 'title': 'Импорт контактов', 'statement': 'Дано n строк «имя телефон». Добавьте все контакты в справочник (порт 7003), посчитайте ответы «OK», затем запросите LIST и выведите «Добавлено: k» и «В справочнике: <ответ LIST>». После этого дана строка имён через пробел — выведите телефоны «имя: телефон» (или «имя: нет»).',
     'solution': 'import socket\n\ndef ask(s, cmd):\n    s.sendall(cmd.encode("utf-8"))\n    return s.recv(1024).decode("utf-8")\n\nwith socket.socket() as s:\n    s.connect(("192.168.1.10", 7003))\n    ok = 0\n    for _ in range(int(input())):\n        ok += ask(s, "ADD " + input()) == "OK"\n    print(f"Добавлено: {ok}")\n    print(f"В справочнике: {ask(s, \'LIST\')}")\n    for name in input().split():\n        r = ask(s, "GET " + name)\n        print(f"{name}: {\'нет\' if r == \'NOT FOUND\' else r}")', 'inputs': [['3', 'Лола 901', 'Азиз 902', 'Бек 903', 'Азиз Ян Лола'], ['0', 'Кто']], 'modules': ['socket'], 'require': ['import:socket', 'def']},
    {'id': 'pb-03', 'title': 'Свой сервер справочника', 'statement': 'Напишите сервер с тем же протоколом, что на порту 7003: ADD, GET, LIST (имена по алфавиту через запятую без пробелов или EMPTY), иначе ERROR. Данные — в словаре, общем для всех клиентов.',
     'solution': 'import socket\n\nbook = {}\n\ndef handle(text):\n    p = text.split()\n    if len(p) == 3 and p[0] == "ADD":\n        book[p[1]] = p[2]\n        return "OK"\n    if len(p) == 2 and p[0] == "GET":\n        return book.get(p[1], "NOT FOUND")\n    if p == ["LIST"]:\n        return ",".join(sorted(book)) or "EMPTY"\n    return "ERROR"\n' + LOOP, 'inputs': [{'files': CL(['LIST', 'ADD Аня 901', 'GET Аня'], ['ADD Бек 902', 'LIST', 'GET Ян', 'DEL Аня'])}], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'pb-04', 'title': 'Справочник на SQLite', 'statement': 'Тот же сервер, но данные в SQLite (таблица contacts: name — PRIMARY KEY, phone; ADD с существующим именем заменяет телефон — INSERT OR REPLACE). Добавьте «FIND начало» — контакты с именем на это начало по алфавиту в виде «имя:телефон» через запятую, или «NOT FOUND».',
     'solution': 'import socket\nimport sqlite3\n\ndb = sqlite3.connect(":memory:")\ndb.execute("CREATE TABLE contacts (name TEXT PRIMARY KEY, phone TEXT)")\n\ndef handle(text):\n    p = text.split()\n    if len(p) == 3 and p[0] == "ADD":\n        db.execute("INSERT OR REPLACE INTO contacts VALUES (?, ?)", (p[1], p[2]))\n        return "OK"\n    if len(p) == 2 and p[0] == "GET":\n        row = db.execute("SELECT phone FROM contacts WHERE name = ?", (p[1],)).fetchone()\n        return row[0] if row else "NOT FOUND"\n    if p == ["LIST"]:\n        return ",".join(r[0] for r in db.execute("SELECT name FROM contacts ORDER BY name")) or "EMPTY"\n    if len(p) == 2 and p[0] == "FIND":\n        rows = db.execute("SELECT name, phone FROM contacts WHERE name LIKE ? ORDER BY name", (p[1] + "%",)).fetchall()\n        return ",".join(f"{n}:{t}" for n, t in rows) or "NOT FOUND"\n    return "ERROR"\n' + LOOP, 'inputs': [{'files': CL(['ADD Алия 901', 'ADD Азиз 902', 'ADD Бек 903', 'FIND А', 'ADD Азиз 999', 'GET Азиз'], ['FIND Я', 'LIST'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'pb-05', 'title': 'Справочник на JSON', 'statement': 'Сервер справочника с JSON-протоколом: запросы {"cmd": "add", "name", "phone"} → {"ok": true}; {"cmd": "get", "name"} → {"ok": true, "phone": …} или {"ok": false, "error": "not found"}; {"cmd": "list"} → {"ok": true, "names": [по алфавиту]}; не JSON или неверный запрос → {"ok": false, "error": "bad request"}. Имена могут содержать пробелы. Ответ — json.dumps(…, ensure_ascii=False).',
     'solution': 'import json\nimport socket\n\nbook = {}\n\ndef answer(text):\n    try:\n        req = json.loads(text)\n        cmd = req["cmd"]\n        if cmd == "add":\n            book[req["name"]] = req["phone"]\n            return {"ok": True}\n        if cmd == "get":\n            if req["name"] in book:\n                return {"ok": True, "phone": book[req["name"]]}\n            return {"ok": False, "error": "not found"}\n        if cmd == "list":\n            return {"ok": True, "names": sorted(book)}\n    except (ValueError, KeyError, TypeError):\n        pass\n    return {"ok": False, "error": "bad request"}\n\ndef handle(text):\n    return json.dumps(answer(text), ensure_ascii=False)\n' + LOOP, 'inputs': [{'files': CL(['{"cmd": "add", "name": "Анна Ли", "phone": "901"}', '{"cmd": "get", "name": "Анна Ли"}', '{"cmd": "get", "name": "Анна"}'], ['{"cmd": "list"}', '{"cmd": "add", "name": "Бек"}', 'привет', '{"cmd": "fly"}'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:json']},
]
