# sqlite3 в Python, часть 2

## Связанные таблицы

Данные разносят по нескольким таблицам, чтобы не повторять: авторы отдельно, книги отдельно, а книга хранит **номер
автора** — внешний ключ.

```python run
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)")
conn.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER REFERENCES authors(id))")
conn.execute("INSERT INTO authors (name) VALUES ('Навои')")
conn.execute("INSERT INTO books (title, author_id) VALUES ('Хамса', 1)")
print(conn.execute("""
    SELECT books.title, authors.name
    FROM books JOIN authors ON books.author_id = authors.id
""").fetchall())
```

- `JOIN … ON` соединяет строки двух таблиц по условию;
- `LEFT JOIN` оставляет строки левой таблицы, даже если пары нет (у автора нет книг) — поля правой будут `NULL`
  (`None` в Python);
- `PRAGMA foreign_keys = ON` включает проверку внешних ключей: нельзя добавить книгу несуществующего автора.

## Транзакции

Несколько изменений, которые должны произойти **вместе или никак** (перевод денег: снять с одного и зачислить другому),
выполняют в транзакции. `with conn:` начинает её; если внутри блока возникло исключение, все изменения блока
**откатываются** (`rollback`), иначе — сохраняются (`commit`).

```python run
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE acc (name TEXT, money INTEGER)")
conn.execute("INSERT INTO acc VALUES ('A', 100)")
try:
    with conn:
        conn.execute("UPDATE acc SET money = money - 500 WHERE name = 'A'")
        raise ValueError("недостаточно средств")
except ValueError:
    pass
print(conn.execute("SELECT money FROM acc").fetchone())
```

## Строки как словари

По умолчанию строка — кортеж, и обращаться к полям приходится по номеру. С `conn.row_factory = sqlite3.Row` к полям
обращаются по имени: `row["title"]`, а `dict(row)` превращает строку в словарь.

## Структура небольшого приложения

Хорошая программа с базой — набор функций: `init_db(conn)` создаёт таблицы, `add_…`, `find_…`, `report_…` выполняют
запросы, а основной цикл только разбирает команды.
