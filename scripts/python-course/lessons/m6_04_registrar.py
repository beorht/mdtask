DIR = 'm6/04-registrar'
THEORY = r'''
# Сетевой регистратор: сокеты и SQLite

Соединим два модуля: сервер принимает команды по сети и хранит данные в базе SQLite. Так устроены почти все
серверные программы: сеть — «вход», база — «память».

## Архитектура

```text
клиент ──команда──▶ сервер ──SQL──▶ база
клиент ◀──ответ─── сервер ◀─строки── база
```

- соединение с базой открывают **один раз** при запуске сервера — данные общие для всех клиентов;
- каждую команду разбирают и превращают в параметризованный запрос (`?` — никакой склейки строк: по сети может
  прийти что угодно);
- на любую ошибку сервер отвечает текстом, а не падает.

## Протокол регистратора

| Команда | Ответ |
| --- | --- |
| `REG имя группа` | `OK <номер>` — номер новой записи |
| `LIST группа` | имена через запятую по алфавиту или `EMPTY` |
| `COUNT` | число записей |
| неизвестная команда | `ERROR` |

## Обработчик команд — отдельная функция

Удобно отделить «что ответить» от «как общаться по сети»: функция `handle(conn_db, text)` получает текст команды и
возвращает ответ, а цикл сервера только читает и отправляет. Такую функцию легко проверить без сети:

```python run
import sqlite3

def handle(db, text):
    parts = text.split()
    if parts == ["COUNT"]:
        (total,) = db.execute("SELECT COUNT(id) FROM people").fetchone()
        return str(total)
    return "ERROR"

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT)")
print(handle(db, "COUNT"), handle(db, "HELLO"))
```

## Уникальность

Чтобы одно имя нельзя было зарегистрировать дважды, в таблице делают ограничение `UNIQUE`, а при повторе ловят
`sqlite3.IntegrityError` и отвечают `EXISTS`.

Учебные клиенты из `_edunet.json` подключаются по очереди, и база общая для них всех — то, что зарегистрировал первый
клиент, видит второй.
'''
CL = lambda *cs: {'_edunet.json': '{"clients": ' + __import__('json').dumps([list(c) for c in cs], ensure_ascii=False) + '}\n'}
SERVE = '''
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
BASE = '''import socket
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT UNIQUE, grp TEXT)")
'''
H1 = '''
def handle(text):
    parts = text.split()
    if len(parts) == 3 and parts[0] == "REG":
        cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        return f"OK {cur.lastrowid}"
    return "ERROR"
'''
H2 = '''
def handle(text):
    parts = text.split()
    if len(parts) == 3 and parts[0] == "REG":
        cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        return f"OK {cur.lastrowid}"
    if len(parts) == 2 and parts[0] == "LIST":
        names = [r[0] for r in db.execute("SELECT name FROM people WHERE grp = ? ORDER BY name", (parts[1],))]
        return ",".join(names) or "EMPTY"
    return "ERROR"
'''
H3 = '''
def handle(text):
    parts = text.split()
    if len(parts) == 3 and parts[0] == "REG":
        try:
            cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        except sqlite3.IntegrityError:
            return "EXISTS"
        return f"OK {cur.lastrowid}"
    if len(parts) == 2 and parts[0] == "LIST":
        names = [r[0] for r in db.execute("SELECT name FROM people WHERE grp = ? ORDER BY name", (parts[1],))]
        return ",".join(names) or "EMPTY"
    if parts == ["COUNT"]:
        return str(db.execute("SELECT COUNT(*) FROM people").fetchone()[0])
    if len(parts) == 2 and parts[0] == "DEL":
        if not parts[1].isdigit():
            return "ERROR"
        cur = db.execute("DELETE FROM people WHERE id = ?", (int(parts[1]),))
        return "DELETED" if cur.rowcount else "NOT FOUND"
    return "ERROR"
'''
TASKS = [
    {'id': 'reg-01', 'title': 'Регистрация', 'statement': 'Сервер с базой SQLite (таблица people: id INTEGER PRIMARY KEY, name, grp). Команда «REG имя группа» добавляет запись и отвечает «OK <номер>»; всё остальное — «ERROR». База общая для всех клиентов.',
     'solution': BASE + H1 + SERVE, 'inputs': [{'files': CL(['REG Али IB', 'REG Лола WEB'], ['REG Бек IB', 'HELLO', 'REG Ян'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'reg-02', 'title': 'Список группы', 'statement': 'Добавьте команду «LIST группа» — имена этой группы по алфавиту через запятую без пробелов или «EMPTY».',
     'solution': BASE + H2 + SERVE, 'inputs': [{'files': CL(['REG Лола WEB', 'REG Али IB', 'LIST IB'], ['REG Бек IB', 'LIST IB', 'LIST WEB', 'LIST GRAPH'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'reg-03', 'title': 'Без повторов', 'statement': 'Сделайте имя уникальным (UNIQUE): повторная регистрация отвечает «EXISTS». Остальное — как в прошлой задаче.',
     'solution': BASE + H2.replace('''        cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        return f"OK {cur.lastrowid}"''', '''        try:
            cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        except sqlite3.IntegrityError:
            return "EXISTS"
        return f"OK {cur.lastrowid}"''') + SERVE, 'inputs': [{'files': CL(['REG Али IB', 'REG Али WEB', 'LIST IB'], ['REG Али IB', 'REG Бек IB', 'LIST IB'])}], 'modules': ['socket'], 'require': ['import:socket', 'try']},
    {'id': 'reg-04', 'title': 'Счёт и удаление', 'statement': 'Добавьте «COUNT» — число записей и «DEL номер» — удалить запись: «DELETED», если была, «NOT FOUND», если нет, «ERROR», если номер не число.',
     'solution': BASE + H3 + SERVE, 'inputs': [{'files': CL(['REG Али IB', 'REG Бек IB', 'COUNT', 'DEL 1', 'DEL 1', 'DEL x', 'COUNT'], ['LIST IB', 'REG Али WEB', 'LIST WEB', 'COUNT'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
    {'id': 'reg-05', 'title': 'Журнал сервера', 'statement': 'К серверу из прошлой задачи добавьте журнал: таблица log (id, client, command). Каждую команду сохраняйте с номером клиента по порядку подключения (1, 2, …). Добавьте команду «STATS» — строки «клиент N: k команд» по всем клиентам, у которых есть команды, через «; » (сама STATS тоже записывается в журнал до подсчёта).',
     'solution': BASE + H3.replace('def handle(text):', 'def base_handle(text):') + '''
db.execute("CREATE TABLE log (id INTEGER PRIMARY KEY, client INTEGER, command TEXT)")

def handle(client, text):
    db.execute("INSERT INTO log (client, command) VALUES (?, ?)", (client, text))
    if text.strip() == "STATS":
        rows = db.execute("SELECT client, COUNT(*) FROM log GROUP BY client ORDER BY client").fetchall()
        return "; ".join(f"клиент {c}: {k} команд" for c, k in rows)
    return base_handle(text)

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
number = 0
while True:
    conn, addr = server.accept()
    number += 1
    while True:
        data = conn.recv(1024)
        if not data:
            break
        conn.sendall(handle(number, data.decode("utf-8")).encode("utf-8"))
    conn.close()
''', 'inputs': [{'files': CL(['REG Али IB', 'COUNT'], ['STATS'], ['REG Бек IB', 'DEL 9', 'STATS'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:sqlite3']},
]
