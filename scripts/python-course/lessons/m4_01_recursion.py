DIR = 'm4/01-recursion'
THEORY = r'''
# Рекурсия

**Рекурсия** — когда функция вызывает сама себя. Задача решается через ту же задачу, но поменьше.

```python run
def countdown(n):
    if n == 0:
        print("Старт!")
        return
    print(n)
    countdown(n - 1)

countdown(3)
```

## Две обязательные части

1. **Базовый случай** — когда ответ известен сразу и рекурсия останавливается (`n == 0`).
2. **Шаг рекурсии** — вызов себя с задачей **меньше** исходной (`n - 1`), так что рано или поздно доходим до базы.

Без базового случая функция вызывает себя бесконечно, и Python останавливает её ошибкой `RecursionError`
(по умолчанию глубина — около 1000 вызовов).

## Как это работает

Факториал: `n! = n · (n − 1)!`, а `0! = 1`.

```python run
def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(5))
```

`fact(5)` ждёт `fact(4)`, тот ждёт `fact(3)`… до `fact(0) = 1`, а потом ответы «поднимаются» обратно:
1 → 1 → 2 → 6 → 24 → 120. Каждый незаконченный вызов хранится в **стеке вызовов**.

## Где рекурсия естественна

- математические определения через самих себя: факториал, числа Фибоначчи, НОД (`gcd(a, b) = gcd(b, a % b)`);
- вложенные структуры: список, внутри которого списки, внутри — ещё списки;
- перебор вариантов: все подмножества, все перестановки;
- «разделяй и властвуй»: задача делится пополам (двоичный поиск, сортировка слиянием, ханойские башни).

## Цена рекурсии

Наивные числа Фибоначчи `fib(n) = fib(n−1) + fib(n−2)` пересчитывают одно и то же экспоненциально много раз.
Помогает **запоминание** результатов (мемоизация): словарь уже вычисленных значений или декоратор
`functools.lru_cache` (о декораторах — в следующем уроке).

```python run
calls = 0
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(20), "вызовов:", calls)
```
'''
TASKS = [
    {'id': 'rec-01', 'title': 'Сумма цифр рекурсией', 'statement': 'Напишите рекурсивную функцию digit_sum(n): сумма цифр n — это последняя цифра плюс сумма цифр числа без неё; для 0 — 0. Дано число — выведите сумму его цифр.',
     'solution': 'def digit_sum(n):\n    if n == 0:\n        return 0\n    return n % 10 + digit_sum(n // 10)\n\nprint(digit_sum(int(input())))', 'inputs': [['2026'], ['0'], ['99999'], ['7']], 'require': ['def:digit_sum', 'recursion'], 'forbid': ['str', 'sum']},
    {'id': 'rec-02', 'title': 'Степень', 'statement': 'Напишите рекурсивную функцию power(a, n) для целого n ≥ 0 без оператора **: если n чётное — power(a, n // 2) в квадрате, иначе a · power(a, n − 1); power(a, 0) = 1. Даны a и n.',
     'solution': 'def power(a, n):\n    if n == 0:\n        return 1\n    if n % 2 == 0:\n        half = power(a, n // 2)\n        return half * half\n    return a * power(a, n - 1)\n\nprint(power(int(input()), int(input())))', 'inputs': [['2', '10'], ['3', '0'], ['5', '13'], ['-2', '7']], 'require': ['def:power', 'recursion'], 'forbid': ['pow']},
    {'id': 'rec-03', 'title': 'Фибоначчи с памятью', 'statement': 'Напишите рекурсивную функцию fib(n) (fib(0) = 0, fib(1) = 1) с запоминанием результатов в словаре, чтобы она быстро работала для n до 90. Дано n — выведите fib(n).',
     'solution': 'memo = {0: 0, 1: 1}\n\ndef fib(n):\n    if n not in memo:\n        memo[n] = fib(n - 1) + fib(n - 2)\n    return memo[n]\n\nprint(fib(int(input())))', 'inputs': [['10'], ['0'], ['1'], ['90'], ['50']], 'require': ['def:fib', 'recursion']},
    {'id': 'rec-04', 'title': 'Плоский список', 'statement': 'Дан вложенный список в формате JSON (например [1, [2, [3, 4]], 5]). Напишите рекурсивную функцию flatten(items), возвращающую все числа одним списком. Выведите их через пробел и во второй строке — максимальную глубину вложенности (у [1, 2] глубина 1).',
     'solution': 'import json\n\ndef flatten(items):\n    out = []\n    for x in items:\n        if isinstance(x, list):\n            out += flatten(x)\n        else:\n            out.append(x)\n    return out\n\ndef depth(items):\n    best = 1\n    for x in items:\n        if isinstance(x, list):\n            d = 1 + depth(x)\n            if d > best:\n                best = d\n    return best\n\ndata = json.loads(input())\nprint(" ".join(map(str, flatten(data))))\nprint(depth(data))', 'inputs': [['[1, [2, [3, 4]], 5]'], ['[1, 2, 3]'], ['[[[[7]]], 8]'], ['[[], [1]]']], 'require': ['def:flatten', 'recursion']},
    {'id': 'rec-05', 'title': 'Ханойские башни', 'statement': 'Нужно переложить n дисков со стержня A на стержень C, используя B; больший диск нельзя класть на меньший. Напишите рекурсивную функцию hanoi(n, src, dst, tmp), выводящую ходы «диск k: X -> Y». В конце выведите «Ходов: <число>».',
     'solution': 'moves = 0\n\ndef hanoi(n, src, dst, tmp):\n    global moves\n    if n == 0:\n        return\n    hanoi(n - 1, src, tmp, dst)\n    print(f"диск {n}: {src} -> {dst}")\n    moves += 1\n    hanoi(n - 1, tmp, dst, src)\n\nhanoi(int(input()), "A", "C", "B")\nprint(f"Ходов: {moves}")', 'inputs': [['1'], ['2'], ['3'], ['4']], 'require': ['def:hanoi', 'recursion']},
    {'id': 'rec-06', 'title': 'Все подмножества', 'statement': 'Даны различные буквы строкой (до 5). Рекурсивно переберите все подмножества (каждая буква — «брать» или «не брать», в порядке строки) и выведите их, каждое строкой, в порядке перебора: сначала ветка «не брать». Пустое подмножество выводите как «-».',
     'solution': 'def subsets(s, i, cur):\n    if i == len(s):\n        print(cur or "-")\n        return\n    subsets(s, i + 1, cur)\n    subsets(s, i + 1, cur + s[i])\n\nsubsets(input(), 0, "")', 'inputs': [['abc'], ['x'], ['кот']], 'require': ['def:subsets', 'recursion'], 'forbid': ['import:itertools']},
]

# Задачи, перенесённые из заданий «Объекты и словари» (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyd-12', 'title': 'Путь во вложенной структуре', 'statement': 'Дана строка JSON — каталог: значения — вложенные каталоги (словари) или числа (размеры файлов), затем путь вида «папка/подпапка/файл». Спуститесь по пути и выведите число; если на каком-то шаге ключа нет — «не найдено», если путь ведёт в каталог — «это папка». Второй строкой выведите «Листьев: N» — сколько чисел во всём каталоге (посчитайте рекурсивной функцией). Решение — на Python, данные храните в словаре (dict).', 'solution': 'import json\n\ndef leaves(node):\n    if not isinstance(node, dict):\n        return 1\n    total = 0\n    for value in node.values():\n        total += leaves(value)\n    return total\n\ntree = json.loads(input())\nnode = tree\nfor part in input().split("/"):\n    if not isinstance(node, dict) or part not in node:\n        node = None\n        break\n    node = node[part]\nif node is None:\n    print("не найдено")\nelif isinstance(node, dict):\n    print("это папка")\nelse:\n    print(node)\nprint(f"Листьев: {leaves(tree)}")', 'inputs': [['{"a": {"b": {"c": 5}, "d": 7}}', 'a/b/c'], ['{"a": {"b": {"c": 5}, "d": 7}}', 'a/x'], ['{"docs": {"cv.pdf": 120, "photos": {"cat.jpg": 900, "dog.jpg": 750}}, "notes.txt": 3}', 'docs/photos'], ['{"x": 1}', 'x/y']], 'require': ['recursion', 'import:json']},
]
