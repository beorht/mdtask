DIR = 'm5/03-sqlite-2'
THEORY = r'''
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
'''
LIB = 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.execute("PRAGMA foreign_keys = ON")\nconn.execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)")\nconn.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER REFERENCES authors(id))")\nfor _ in range(int(input())):\n    conn.execute("INSERT INTO authors (name) VALUES (?)", (input(),))\nfor _ in range(int(input())):\n    title, aid = input().rsplit(" ", 1)\n    conn.execute("INSERT INTO books (title, author_id) VALUES (?, ?)", (title, int(aid)))\n'
LIBIN = ['3', 'Навои', 'Кадыри', 'Чолпон', '4', 'Хамса 1', 'Минувшие дни 2', 'Скорпион из алтаря 2', 'Лисон ут-тайр 1']
TASKS = [
    {'id': 'sq2-01', 'title': 'Книги и авторы', 'statement': 'Таблицы authors (id, name) и books (id, title, author_id). Дано k авторов (по строке, номера 1, 2, …), затем m книг «название номер_автора» (номер — последнее слово строки). Запросом с JOIN выведите книги по названию: «название — автор».',
     'solution': LIB + 'for title, name in conn.execute("SELECT books.title, authors.name FROM books JOIN authors ON books.author_id = authors.id ORDER BY books.title"):\n    print(f"{title} — {name}")', 'inputs': [LIBIN, ['1', 'A', '1', 'X 1']], 'require': ['import:sqlite3']},
    {'id': 'sq2-02', 'title': 'Сколько книг у автора', 'statement': 'Те же таблицы и ввод. Запросом с LEFT JOIN и GROUP BY выведите всех авторов по убыванию числа книг (при равенстве — по имени): «автор: k».',
     'solution': LIB + 'for name, k in conn.execute("SELECT authors.name, COUNT(books.id) FROM authors LEFT JOIN books ON books.author_id = authors.id GROUP BY authors.id ORDER BY COUNT(books.id) DESC, authors.name"):\n    print(f"{name}: {k}")', 'inputs': [LIBIN, ['2', 'Б', 'А', '0']], 'require': ['import:sqlite3']},
    {'id': 'sq2-03', 'title': 'Внешний ключ', 'statement': 'Те же таблицы с PRAGMA foreign_keys = ON. После авторов и книг идут ещё строки «название номер_автора» до «стоп»: пробуйте добавить каждую и выводите «Добавлено: название» или «Ошибка: нет автора <номер>» (sqlite3.IntegrityError). В конце — «Книг: k».',
     'solution': LIB + 'while True:\n    line = input()\n    if line == "стоп":\n        break\n    title, aid = line.rsplit(" ", 1)\n    try:\n        conn.execute("INSERT INTO books (title, author_id) VALUES (?, ?)", (title, int(aid)))\n        print(f"Добавлено: {title}")\n    except sqlite3.IntegrityError:\n        print(f"Ошибка: нет автора {aid}")\nprint("Книг:", conn.execute("SELECT COUNT(*) FROM books").fetchone()[0])', 'inputs': [LIBIN + ['Ночь и день 3', 'Неизвестная 9', 'стоп'], ['1', 'A', '0', 'X 2', 'Y 1', 'стоп']], 'require': ['import:sqlite3', 'try']},
    {'id': 'sq2-04', 'title': 'Переводы в транзакции', 'statement': 'Таблица accounts (name, money). Дано n строк «имя сумма», затем переводы «откуда куда сумма» до «стоп». Каждый перевод — в транзакции with conn: снять, затем проверить, что баланс не стал отрицательным (иначе ValueError — изменения откатятся), зачислить. На ошибку — «Отказ: <откуда> -> <куда>». В конце — счета по имени «имя: деньги».',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.execute("CREATE TABLE accounts (name TEXT, money INTEGER)")\nfor _ in range(int(input())):\n    name, money = input().split()\n    conn.execute("INSERT INTO accounts VALUES (?, ?)", (name, int(money)))\nconn.commit()\nwhile True:\n    line = input()\n    if line == "стоп":\n        break\n    a, b, s = line.split()\n    try:\n        with conn:\n            conn.execute("UPDATE accounts SET money = money - ? WHERE name = ?", (int(s), a))\n            if conn.execute("SELECT money FROM accounts WHERE name = ?", (a,)).fetchone()[0] < 0:\n                raise ValueError("мало денег")\n            conn.execute("UPDATE accounts SET money = money + ? WHERE name = ?", (int(s), b))\n    except ValueError:\n        print(f"Отказ: {a} -> {b}")\nfor name, money in conn.execute("SELECT name, money FROM accounts ORDER BY name"):\n    print(f"{name}: {money}")', 'inputs': [['2', 'Аня 100', 'Бек 50', 'Аня Бек 30', 'Бек Аня 500', 'Бек Аня 80', 'стоп']], 'require': ['import:sqlite3', 'with', 'try']},
    {'id': 'sq2-05', 'title': 'Контакты', 'statement': 'Приложение-справочник на таблице contacts (id INTEGER PRIMARY KEY, name, phone, city) с row_factory = sqlite3.Row. Команды до «стоп»: «add имя телефон город» (вывести «#id»), «find текст» — контакты, где имя начинается с текста (LIKE ?), по имени: «имя, телефон, город» или «не найдено», «city город» — имена через запятую и пробел по алфавиту или «нет», «del id» — «удалён» или «нет такого».',
     'solution': 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.row_factory = sqlite3.Row\nconn.execute("CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, city TEXT)")\nwhile True:\n    p = input().split()\n    if p[0] == "стоп":\n        break\n    if p[0] == "add":\n        cur = conn.execute("INSERT INTO contacts (name, phone, city) VALUES (?, ?, ?)", (p[1], p[2], p[3]))\n        print(f"#{cur.lastrowid}")\n    elif p[0] == "find":\n        rows = conn.execute("SELECT * FROM contacts WHERE name LIKE ? ORDER BY name", (p[1] + "%",)).fetchall()\n        if not rows:\n            print("не найдено")\n        for r in rows:\n            print(f"{r[\'name\']}, {r[\'phone\']}, {r[\'city\']}")\n    elif p[0] == "city":\n        names = [r["name"] for r in conn.execute("SELECT name FROM contacts WHERE city = ? ORDER BY name", (p[1],))]\n        print(", ".join(names) if names else "нет")\n    elif p[0] == "del":\n        cur = conn.execute("DELETE FROM contacts WHERE id = ?", (int(p[1]),))\n        print("удалён" if cur.rowcount else "нет такого")', 'inputs': [['add Азиз 901 Хива', 'add Алия 902 Нукус', 'add Бек 903 Хива', 'find А', 'city Хива', 'del 1', 'del 7', 'find Аз', 'city Бухара', 'стоп']], 'require': ['import:sqlite3']},
]
