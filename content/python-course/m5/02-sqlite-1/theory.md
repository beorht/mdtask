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
