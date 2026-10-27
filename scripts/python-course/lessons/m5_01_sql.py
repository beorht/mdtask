DIR = 'm5/01-sql'
THEORY = r'''
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
'''
SETUP = 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\n'
TASKS = [
    {'id': 'sql-01', 'title': 'Список студентов', 'statement': 'Создайте таблицу students (name, age). Дано n строк «имя возраст» — добавьте их. Выведите всех студентов запросом с сортировкой по имени: «имя возраст».',
     'solution': SETUP + 'conn.execute("CREATE TABLE students (name TEXT, age INTEGER)")\nfor _ in range(int(input())):\n    name, age = input().split()\n    conn.execute("INSERT INTO students VALUES (?, ?)", (name, int(age)))\nfor name, age in conn.execute("SELECT name, age FROM students ORDER BY name"):\n    print(name, age)', 'inputs': [['3', 'Вали 19', 'Али 20', 'Гуля 18'], ['1', 'Я 1']], 'require': ['import:sqlite3']},
    {'id': 'sql-02', 'title': 'Товары до цены', 'statement': 'Таблица products (name, price). Дано n товаров, затем максимальная цена. Выведите товары не дороже неё по возрастанию цены (при равной цене — по названию) запросом с WHERE и ORDER BY, затем «Найдено: k» (COUNT в SQL).',
     'solution': SETUP + 'conn.execute("CREATE TABLE products (name TEXT, price INTEGER)")\nfor _ in range(int(input())):\n    name, price = input().split()\n    conn.execute("INSERT INTO products VALUES (?, ?)", (name, int(price)))\nlimit = int(input())\nfor name, price in conn.execute("SELECT name, price FROM products WHERE price <= ? ORDER BY price, name", (limit,)):\n    print(name, price)\nprint("Найдено:", conn.execute("SELECT COUNT(*) FROM products WHERE price <= ?", (limit,)).fetchone()[0])', 'inputs': [['4', 'чай 20000', 'сок 15000', 'кофе 45000', 'вода 3000', '20000'], ['2', 'a 5', 'b 6', '1']], 'require': ['import:sqlite3']},
    {'id': 'sql-03', 'title': 'Подорожание', 'statement': 'Таблица goods (name, category, price). Дано n строк «название категория цена», затем категория и процент. Поднимите цены этой категории одним запросом UPDATE (новая цена — целая часть price · (100 + p) / 100, используйте в SQL выражение price * (100 + ?) / 100) и выведите всю таблицу по названию: «название категория цена».',
     'solution': SETUP + 'conn.execute("CREATE TABLE goods (name TEXT, category TEXT, price INTEGER)")\nfor _ in range(int(input())):\n    n, c, p = input().split()\n    conn.execute("INSERT INTO goods VALUES (?, ?, ?)", (n, c, int(p)))\ncat = input()\npct = int(input())\nconn.execute("UPDATE goods SET price = price * (100 + ?) / 100 WHERE category = ?", (pct, cat))\nfor row in conn.execute("SELECT name, category, price FROM goods ORDER BY name"):\n    print(*row)', 'inputs': [['3', 'молоко молочное 12000', 'сыр молочное 45000', 'хлеб выпечка 4000', 'молочное', '10'], ['1', 'x y 99', 'z', '50']], 'require': ['import:sqlite3']},
    {'id': 'sql-04', 'title': 'Удалить закончившиеся', 'statement': 'Таблица stock (name, qty). Дано n строк «название количество». Удалите одним запросом DELETE товары с нулевым количеством, выведите «Удалено: k» (cursor.rowcount) и оставшиеся товары по убыванию количества «название qty».',
     'solution': SETUP + 'conn.execute("CREATE TABLE stock (name TEXT, qty INTEGER)")\nfor _ in range(int(input())):\n    n, q = input().split()\n    conn.execute("INSERT INTO stock VALUES (?, ?)", (n, int(q)))\ncur = conn.execute("DELETE FROM stock WHERE qty = 0")\nprint("Удалено:", cur.rowcount)\nfor row in conn.execute("SELECT name, qty FROM stock ORDER BY qty DESC, name"):\n    print(*row)', 'inputs': [['4', 'ручка 10', 'клей 0', 'мел 3', 'скотч 0'], ['1', 'a 0']], 'require': ['import:sqlite3']},
    {'id': 'sql-05', 'title': 'Продажи по городам', 'statement': 'Таблица sales (city, amount). Дано n строк «город сумма». Запросом с GROUP BY выведите для каждого города «город: сумма (заказов: k)» по убыванию суммы, а в конце — средний чек по всем продажам (AVG, округлить до двух знаков в Python).',
     'solution': SETUP + 'conn.execute("CREATE TABLE sales (city TEXT, amount INTEGER)")\nfor _ in range(int(input())):\n    c, a = input().split()\n    conn.execute("INSERT INTO sales VALUES (?, ?)", (c, int(a)))\nfor city, total, k in conn.execute("SELECT city, SUM(amount), COUNT(*) FROM sales GROUP BY city ORDER BY SUM(amount) DESC, city"):\n    print(f"{city}: {total} (заказов: {k})")\nprint(round(conn.execute("SELECT AVG(amount) FROM sales").fetchone()[0], 2))', 'inputs': [['5', 'Хива 100', 'Нукус 50', 'Хива 30', 'Ургенч 200', 'Нукус 50'], ['1', 'А 7']], 'require': ['import:sqlite3']},
]
