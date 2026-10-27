DIR = 'm4/02-decorators'
THEORY = r'''
# Функции высшего порядка и декораторы

В Python функция — такое же значение, как число или строка: её можно положить в переменную, передать в другую функцию
и вернуть из функции.

```python run
def shout(text):
    return text.upper() + "!"

action = shout
print(action("привет"))
```

## Функции высшего порядка

**Функция высшего порядка** принимает функцию как аргумент или возвращает её. Встроенные примеры:

| Функция | Что делает | Пример |
| --- | --- | --- |
| `map(f, seq)` | применяет `f` к каждому элементу | `list(map(int, ["1", "2"]))` |
| `filter(f, seq)` | оставляет элементы, где `f` даёт `True` | `list(filter(str.isdigit, ["a", "1"]))` |
| `sorted(seq, key=f)` | сортирует по значению `f(x)` | `sorted(words, key=len)` |

## lambda

`lambda x: x * 2` — короткая функция без имени, для случаев «один раз и сразу»:

```python run
nums = [3, -7, 1, -2]
print(sorted(nums, key=lambda x: abs(x)))
print(list(filter(lambda x: x > 0, nums)))
```

## Функция, возвращающая функцию (замыкание)

```python run
def make_multiplier(k):
    def multiply(x):
        return x * k
    return multiply

triple = make_multiplier(3)
print(triple(5), triple(10))
```

Внутренняя функция «помнит» `k` из внешней — это называется **замыканием**.

## Декораторы

**Декоратор** — функция, которая принимает функцию и возвращает её «улучшенную» версию: с логированием, проверками,
подсчётом вызовов. Запись `@decor` над `def` — то же самое, что `f = decor(f)`.

```python run
def logged(func):
    def wrapper(*args):
        print("вызов", func.__name__, args)
        result = func(*args)
        print("результат", result)
        return result
    return wrapper

@logged
def add(a, b):
    return a + b

add(2, 3)
```

`wrapper(*args, **kwargs)` принимает любые аргументы и передаёт их исходной функции — так декоратор подходит к любой
функции. Готовые декораторы стандартной библиотеки: `functools.lru_cache` (запоминание результатов), `@property`,
`@staticmethod` (о них — в уроках про классы).
'''
TASKS = [
    {'id': 'hof-01', 'title': 'map и filter', 'statement': 'Даны строки-числа через пробел (могут быть и слова). С помощью filter оставьте только целые числа (str.isdigit), с помощью map возведите их в квадрат и выведите через пробел (или «Нет чисел»).',
     'solution': 'items = input().split()\nnums = list(map(lambda s: int(s) ** 2, filter(str.isdigit, items)))\nprint(" ".join(map(str, nums)) if nums else "Нет чисел")', 'inputs': [['1 a 2 3 b'], ['x y'], ['10']], 'forbid': ['for', 'while']},
    {'id': 'hof-02', 'title': 'Сортировка по ключу', 'statement': 'Дано n и n строк «имя возраст город». Выведите строки, отсортированные по городу, внутри города — по убыванию возраста (sorted с key и lambda), в том же формате.',
     'solution': 'n = int(input())\npeople = [input().split() for _ in range(n)]\nfor name, age, city in sorted(people, key=lambda p: (p[2], -int(p[1]))):\n    print(name, age, city)', 'inputs': [['4', 'Али 20 Хива', 'Бек 30 Бухара', 'Гуля 25 Хива', 'Дина 19 Бухара'], ['1', 'Я 1 Х']]},
    {'id': 'hof-03', 'title': 'Множитель', 'statement': 'Напишите функцию make_multiplier(k), возвращающую функцию умножения на k. Даны k и числа через пробел — получите функцию и примените её к каждому числу, выведите через пробел.',
     'solution': 'def make_multiplier(k):\n    def multiply(x):\n        return x * k\n    return multiply\n\nf = make_multiplier(int(input()))\nprint(" ".join(str(f(int(x))) for x in input().split()))', 'inputs': [['3', '1 2 3'], ['-1', '5 -5'], ['0', '7']], 'require': ['def:make_multiplier']},
    {'id': 'hof-04', 'title': 'Счётчик вызовов', 'statement': 'Напишите декоратор count_calls, который считает вызовы функции и хранит счёт в атрибуте calls у обёртки. Примените его к функции square(x). Дано n и n чисел — выведите квадраты и в конце «Вызовов: <n>» (значение square.calls).',
     'solution': 'def count_calls(func):\n    def wrapper(*args, **kwargs):\n        wrapper.calls += 1\n        return func(*args, **kwargs)\n    wrapper.calls = 0\n    return wrapper\n\n@count_calls\ndef square(x):\n    return x * x\n\nn = int(input())\nfor _ in range(n):\n    print(square(int(input())))\nprint(f"Вызовов: {square.calls}")', 'inputs': [['3', '2', '3', '4'], ['0']], 'require': ['def:count_calls', 'decorator']},
    {'id': 'hof-05', 'title': 'Журнал вызовов', 'statement': 'Напишите декоратор log, который перед вызовом выводит «-> имя(аргументы через запятую и пробел)», а после — «<- результат». Примените к функциям add(a, b) и greet(name), возвращающим a + b и «Привет, name». Дано n команд «add a b» или «greet имя».',
     'solution': 'def log(func):\n    def wrapper(*args):\n        print(f"-> {func.__name__}({\', \'.join(map(str, args))})")\n        result = func(*args)\n        print(f"<- {result}")\n        return result\n    return wrapper\n\n@log\ndef add(a, b):\n    return a + b\n\n@log\ndef greet(name):\n    return f"Привет, {name}"\n\nn = int(input())\nfor _ in range(n):\n    parts = input().split()\n    if parts[0] == "add":\n        add(int(parts[1]), int(parts[2]))\n    else:\n        greet(parts[1])', 'inputs': [['2', 'add 2 3', 'greet Лола'], ['1', 'add -1 1']], 'require': ['def:log', 'decorator']},
    {'id': 'hof-06', 'title': 'Запоминание результатов', 'statement': 'Напишите декоратор memoize, который хранит результаты в словаре по аргументам и не вызывает функцию повторно. Примените к рекурсивной функции ways(n) — сколькими способами подняться на n ступенек, шагая на 1 или 2 (ways(0) = ways(1) = 1). Дано n до 80.',
     'solution': 'def memoize(func):\n    cache = {}\n    def wrapper(n):\n        if n not in cache:\n            cache[n] = func(n)\n        return cache[n]\n    return wrapper\n\n@memoize\ndef ways(n):\n    if n < 2:\n        return 1\n    return ways(n - 1) + ways(n - 2)\n\nprint(ways(int(input())))', 'inputs': [['4'], ['0'], ['10'], ['80']], 'require': ['def:memoize', 'decorator', 'recursion'], 'forbid': ['import:functools']},
]
