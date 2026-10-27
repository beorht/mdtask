# SQL: таблицы, вставка, выборка, изменение

**База данных** хранит данные в **таблицах**: строки — записи, столбцы — поля. Язык запросов к таким базам — **SQL**.
Подробно SQL отрабатывается в SQL-тренажёре сайта (предмет «Базы данных»), здесь — основы и как выполнять SQL из
Python.

## SQL из Python

Модуль `sqlite3` встроен в Python: база SQLite — это один файл (или база в памяти `":memory:"`).

```python run
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE fruits (name TEXT, price INTEGER)")
conn.execute("INSERT INTO fruits VALUES ('яблоко', 12000)")
conn.execute("INSERT INTO fruits VALUES ('банан', 18000)")
for row in conn.execute("SELECT name, price FROM fruits ORDER BY price DESC"):
    print(row)
```

`conn.execute(sql)` выполняет запрос; результат SELECT можно перебрать циклом — каждая строка приходит **кортежем**.

## Основные команды

| Команда | Пример |
| --- | --- |
| создать таблицу | `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)` |
| добавить | `INSERT INTO users (name, age) VALUES ('Лола', 19)` |
| выбрать | `SELECT name FROM users WHERE age >= 18 ORDER BY name` |
| изменить | `UPDATE users SET age = age + 1 WHERE name = 'Лола'` |
| удалить | `DELETE FROM users WHERE age < 16` |

Без `WHERE` команды `UPDATE` и `DELETE` затронут **все** строки.

## Условия и сортировка

`WHERE` — фильтр: `=`, `<>`, `<`, `>=`, `AND`, `OR`, `NOT`, `IN (…)`, `BETWEEN a AND b`, `LIKE 'А%'` (начинается с
«А»). `ORDER BY поле [DESC]` — порядок, `LIMIT n` — первые n строк.

## Агрегаты и группировка

| Функция | Что считает |
| --- | --- |
| `COUNT(*)` | число строк |
| `SUM(поле)`, `AVG(поле)` | сумму, среднее |
| `MIN(поле)`, `MAX(поле)` | наименьшее, наибольшее |

```python run
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (city TEXT, total INTEGER)")
for city, total in [("Хива", 5), ("Ургенч", 7), ("Хива", 3)]:
    conn.execute("INSERT INTO orders VALUES (?, ?)", (city, total))
print(conn.execute("SELECT city, SUM(total) FROM orders GROUP BY city ORDER BY city").fetchall())
```

`GROUP BY поле` собирает строки с одинаковым значением в группы и считает агрегат для каждой. Знаки `?` в запросе —
**параметры**: значения подставляются безопасно (подробно — в следующем уроке).

В задачах этого урока данные приходят во вводе: создайте таблицу, добавьте строки и выполните нужный запрос именно на
SQL (`WHERE`, `ORDER BY`, `GROUP BY`), а не циклами Python.
