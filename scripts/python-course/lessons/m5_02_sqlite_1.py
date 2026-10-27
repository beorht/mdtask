DIR = 'm5/02-sqlite-1'
THEORY = r'''
# sqlite3 в Python, часть 1

## Соединение и курсор

```python run
import sqlite3

conn = sqlite3.connect(":memory:")   # или имя файла: "school.db"
cur = conn.cursor()
cur.execute("CREATE TABLE pupils (id INTEGER PRIMARY KEY, name TEXT, mark INTEGER)")
cur.execute("INSERT INTO pupils (name, mark) VALUES (?, ?)", ("Азиз", 5))
print(cur.lastrowid)
conn.commit()
conn.close()
```

- `connect` открывает (или создаёт) базу;
- **курсор** выполняет запросы и хранит их результаты; `conn.execute(...)` — короткая запись, создающая курсор сам;
- `INTEGER PRIMARY KEY` — номер записи, SQLite заполняет его сам; `cur.lastrowid` — номер только что вставленной;
- `commit()` **сохраняет** изменения. Без него при закрытии файловой базы изменения пропадут;
- `close()` закрывает соединение. Удобно `with conn:` — блок, после которого изменения сохраняются сами.

## Получение результатов

| Метод | Что возвращает |
| --- | --- |
| `cur.fetchone()` | одну строку-кортеж или `None`, если строк нет |
| `cur.fetchall()` | список всех строк |
| `for row in cur:` | строки по одной |

## Параметры — только через ?

Никогда не собирайте SQL из строк пользователя через `+` или f-строку:

```python run
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, secret TEXT)")
conn.execute("INSERT INTO users VALUES ('admin', 'тайна')")

evil = "x' OR '1'='1"
bad = f"SELECT secret FROM users WHERE name = '{evil}'"
print("склейка:", conn.execute(bad).fetchall())
print("параметр:", conn.execute("SELECT secret FROM users WHERE name = ?", (evil,)).fetchall())
```

Склейка позволила «злому» вводу изменить смысл запроса и достать чужой секрет — это **SQL-инъекция**, одна из самых
частых уязвимостей. Параметр `?` передаёт значение отдельно от запроса, и оно никогда не становится частью SQL.
Параметры передают кортежем — для одного значения не забудьте запятую: `(name,)`.

## Много строк сразу

`executemany(sql, список_кортежей)` выполняет запрос для каждого кортежа.

```python run
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE t (a INTEGER, b TEXT)")
conn.executemany("INSERT INTO t VALUES (?, ?)", [(1, "x"), (2, "y"), (3, "z")])
print(conn.execute("SELECT COUNT(*), SUM(a) FROM t").fetchone())
```
'''
TASKS = [
    {'id': 'sq1-01', 'title': 'Безопасный поиск', 'statement': 'Таблица users (name, phone). Дано n строк «имя телефон» (добавьте executemany), затем запросы — имена (могут содержать кавычки и другие символы) до строки «конец». Для каждого найдите телефон запросом с параметром ? и выведите его или «Не найден».',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.execute("CREATE TABLE users (name TEXT, phone TEXT)")\nn = int(input())\nconn.executemany("INSERT INTO users VALUES (?, ?)", [tuple(input().split()) for _ in range(n)])\nwhile True:\n    q = input()\n    if q == "конец":\n        break\n    row = conn.execute("SELECT phone FROM users WHERE name = ?", (q,)).fetchone()\n    print(row[0] if row else "Не найден")', 'inputs': [['2', 'Аня 901', "O'Neil 902", "O'Neil", "x' OR '1'='1", 'Аня', 'конец']], 'require': ['import:sqlite3']},
    {'id': 'sq1-02', 'title': 'Номера записей', 'statement': 'Таблица tasks (id INTEGER PRIMARY KEY, title TEXT). Дано n заголовков — добавляйте по одному и после каждой вставки выводите «#<lastrowid> <заголовок>». Затем выведите «Всего: k» (COUNT).',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncur = conn.cursor()\ncur.execute("CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT)")\nfor _ in range(int(input())):\n    t = input()\n    cur.execute("INSERT INTO tasks (title) VALUES (?)", (t,))\n    print(f"#{cur.lastrowid} {t}")\nprint("Всего:", cur.execute("SELECT COUNT(*) FROM tasks").fetchone()[0])', 'inputs': [['3', 'купить хлеб', 'сделать урок', 'позвонить'], ['0']], 'require': ['import:sqlite3']},
    {'id': 'sq1-03', 'title': 'Поиск по номеру', 'statement': 'Таблица pupils (id INTEGER PRIMARY KEY, name TEXT, mark INTEGER). Дано n строк «имя оценка» (номера назначит SQLite: 1, 2, …), затем номера через пробел. Для каждого номера выведите «имя: оценка» (fetchone) или «Нет ученика <номер>».',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.execute("CREATE TABLE pupils (id INTEGER PRIMARY KEY, name TEXT, mark INTEGER)")\nfor _ in range(int(input())):\n    name, mark = input().split()\n    conn.execute("INSERT INTO pupils (name, mark) VALUES (?, ?)", (name, int(mark)))\nfor i in map(int, input().split()):\n    row = conn.execute("SELECT name, mark FROM pupils WHERE id = ?", (i,)).fetchone()\n    print(f"{row[0]}: {row[1]}" if row else f"Нет ученика {i}")', 'inputs': [['3', 'Али 5', 'Вали 4', 'Гани 3', '2 5 1'], ['1', 'Я 5', '0']], 'require': ['import:sqlite3']},
    {'id': 'sq1-04', 'title': 'Файл базы и commit', 'statement': 'Создайте файловую базу school.db с таблицей marks (name, mark), добавьте n строк «имя оценка» и сделайте commit, закройте соединение. Затем откройте school.db заново и выведите «Записей: k» и «Средняя: <AVG, округлить до двух знаков>».',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect("school.db")\nconn.execute("CREATE TABLE marks (name TEXT, mark INTEGER)")\nfor _ in range(int(input())):\n    name, mark = input().split()\n    conn.execute("INSERT INTO marks VALUES (?, ?)", (name, int(mark)))\nconn.commit()\nconn.close()\n\nconn = sqlite3.connect("school.db")\ncount, avg = conn.execute("SELECT COUNT(*), AVG(mark) FROM marks").fetchone()\nprint(f"Записей: {count}")\nprint(f"Средняя: {round(avg, 2)}")\nconn.close()', 'inputs': [['3', 'Али 5', 'Вали 4', 'Гани 4'], ['1', 'Я 2']], 'require': ['import:sqlite3']},
    {'id': 'sq1-05', 'title': 'Журнал оценок', 'statement': 'Таблица grades (student, subject, mark). Сначала n строк «ученик предмет оценка» (executemany). Затем команды до «стоп»: «avg ученик» — средняя ученика (два знака) или «нет оценок»; «best предмет» — ученик с лучшей средней по предмету (ORDER BY … LIMIT 1, при равенстве — по алфавиту) или «нет оценок»; «count» — число оценок.',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.execute("CREATE TABLE grades (student TEXT, subject TEXT, mark INTEGER)")\nn = int(input())\nrows = []\nfor _ in range(n):\n    s, sub, m = input().split()\n    rows.append((s, sub, int(m)))\nconn.executemany("INSERT INTO grades VALUES (?, ?, ?)", rows)\nwhile True:\n    p = input().split()\n    if p[0] == "стоп":\n        break\n    if p[0] == "avg":\n        v = conn.execute("SELECT AVG(mark) FROM grades WHERE student = ?", (p[1],)).fetchone()[0]\n        print(round(v, 2) if v is not None else "нет оценок")\n    elif p[0] == "best":\n        row = conn.execute("SELECT student FROM grades WHERE subject = ? GROUP BY student ORDER BY AVG(mark) DESC, student LIMIT 1", (p[1],)).fetchone()\n        print(row[0] if row else "нет оценок")\n    elif p[0] == "count":\n        print(conn.execute("SELECT COUNT(*) FROM grades").fetchone()[0])', 'inputs': [['5', 'Али математика 5', 'Вали математика 4', 'Али физика 3', 'Вали физика 5', 'Гани математика 5', 'avg Али', 'avg Дина', 'best математика', 'best химия', 'count', 'стоп']], 'require': ['import:sqlite3']},
]
