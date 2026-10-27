DIR = 'm3/01-functions'
THEORY = r'''
# Функции: создание, вызов, аргументы

**Функция** — именованный кусок кода, который можно вызывать много раз. Вы уже пользовались готовыми функциями:
`print`, `len`, `input`. Теперь будем писать свои.

## Создание и вызов

```python run
def say_hello():
    print("Привет!")
    print("Рад видеть.")

say_hello()
say_hello()
```

`def` — объявление функции, дальше имя, скобки и двоеточие; тело — с отступом. Объявление само ничего не выполняет:
код работает, только когда функцию **вызывают** — по имени со скобками. Функцию объявляют **до** первого вызова.

## Параметры и аргументы

В скобках при объявлении пишут **параметры** — имена для данных, которые функция получит. При вызове в скобках
передают **аргументы** — сами значения.

```python run
def greet_city(city, times):
    for i in range(times):
        print("Здравствуй,", city)

greet_city("Хива", 2)
greet_city("Термез", 1)
```

Аргументы подставляются по порядку. Можно указывать их по имени — тогда порядок не важен:
`greet_city(times=3, city="Наманган")`.

## Зачем нужны функции

- **Не повторяться.** Код, который нужен в нескольких местах, пишут один раз.
- **Разбить задачу на части.** Большая программа — это много маленьких понятных функций.
- **Дать имя действию.** `draw_border()` понятнее десяти строк с `print`.

## Функция внутри цикла и функция из функции

Функцию можно вызывать в цикле и из другой функции:

```python run
def stars(n):
    print("*" * n)

def pyramid(height):
    for i in range(1, height + 1):
        stars(i)

pyramid(3)
```

## Имена функций

Как у переменных: маленькие латинские буквы и `_`, имя говорит, **что делает** функция: `print_report`,
`draw_table`. Не называйте свои функции `print`, `input`, `list` — встроенные перестанут работать.

В задачах этого урока функции **выводят** результат через `print`. Как функция **возвращает** значение — в уроке о
`return`.
'''
TASKS = [
    {'id': 'fn-01', 'title': 'Приветствие функцией', 'statement': 'Напишите функцию greet(name), которая выводит «Привет, <name>!». Программа получает n и затем n имён и для каждого вызывает greet.',
     'solution': 'def greet(name):\n    print(f"Привет, {name}!")\n\nn = int(input())\nfor _ in range(n):\n    greet(input())', 'inputs': [['2', 'Аня', 'Бек'], ['1', 'Мир'], ['3', 'a', 'b', 'c']], 'require': ['def:greet']},
    {'id': 'fn-02', 'title': 'Линия', 'statement': 'Напишите функцию line(symbol, n), которая выводит строку из n символов symbol. Дан символ и число k — с её помощью выведите «треугольник»: строки длиной 1, 2, …, k.',
     'solution': 'def line(symbol, n):\n    print(symbol * n)\n\nch = input()\nk = int(input())\nfor i in range(1, k + 1):\n    line(ch, i)', 'inputs': [['*', '3'], ['#', '1'], ['+', '5']], 'require': ['def:line']},
    {'id': 'fn-03', 'title': 'Рамка', 'statement': 'Напишите функцию frame(text), которая выводит текст в рамке из звёздочек: строка звёздочек длиной len(text) + 4, затем «* текст *», затем снова звёздочки. Выведите рамку для каждой из двух введённых строк.',
     'solution': 'def frame(text):\n    print("*" * (len(text) + 4))\n    print(f"* {text} *")\n    print("*" * (len(text) + 4))\n\nframe(input())\nframe(input())', 'inputs': [['Привет', 'Python'], ['a', 'длинная строка']], 'require': ['def:frame']},
    {'id': 'fn-04', 'title': 'Таблица степеней', 'statement': 'Напишите функцию powers(n, k), которая выводит строки «n^1 = …», «n^2 = …», …, «n^k = …». Даны n и k.',
     'solution': 'def powers(n, k):\n    value = 1\n    for i in range(1, k + 1):\n        value *= n\n        print(f"{n}^{i} = {value}")\n\npowers(int(input()), int(input()))', 'inputs': [['2', '5'], ['3', '1'], ['10', '4']], 'require': ['def:powers']},
    {'id': 'fn-05', 'title': 'Отчёт о покупке', 'statement': 'Напишите функцию receipt(name, price, count), которая выводит три строки: «Товар: <name>», «Количество: <count>», «Сумма: <price × count>». Дано n, затем n строк «название цена количество» — выведите отчёт по каждой, разделяя отчёты строкой «---».',
     'solution': 'def receipt(name, price, count):\n    print(f"Товар: {name}")\n    print(f"Количество: {count}")\n    print(f"Сумма: {price * count}")\n\nn = int(input())\nfor i in range(n):\n    name, price, count = input().split()\n    if i > 0:\n        print("---")\n    receipt(name, int(price), int(count))',
     'inputs': [['2', 'хлеб 4000 2', 'сыр 45000 1'], ['1', 'ручка 1500 10']], 'require': ['def:receipt']},
    {'id': 'fn-06', 'title': 'Шахматная доска', 'statement': 'Напишите функцию row(n, start), которая выводит строку из n клеток, чередуя «#» и «.» и начиная с символа start. Дано n — с её помощью выведите доску n × n: строки начинаются по очереди с «#» и с «.».',
     'solution': 'def row(n, start):\n    other = "." if start == "#" else "#"\n    s = ""\n    for i in range(n):\n        s += start if i % 2 == 0 else other\n    print(s)\n\nn = int(input())\nfor r in range(n):\n    row(n, "#" if r % 2 == 0 else ".")', 'inputs': [['4'], ['1'], ['5']], 'require': ['def:row']},
]

# Задачи, перенесённые из банка задач Python (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyb-09', 'title': 'Функция проверки на простоту', 'statement': 'Напишите функцию is_prime(n), которая возвращает True, если n простое, и False иначе. Даны числа a и b (a ≥ 2). С её помощью выведите через пробел все простые числа от a до b включительно или «нет», если их нет. Решение — на Python.', 'solution': 'def is_prime(n):\n    if n < 2:\n        return False\n    d = 2\n    while d * d <= n:\n        if n % d == 0:\n            return False\n        d += 1\n    return True\n\na = int(input())\nb = int(input())\nprimes = []\nfor k in range(a, b + 1):\n    if is_prime(k):\n        primes.append(str(k))\nprint(" ".join(primes) if primes else "нет")', 'inputs': [['2', '50'], ['14', '16'], ['90', '110']], 'require': ['def:is_prime']},
]
