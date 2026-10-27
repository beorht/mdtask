DIR = 'm3/04-args'
THEORY = r'''
# Значения по умолчанию, *args, **kwargs

## Значения по умолчанию

Параметру можно задать значение, которое используется, если аргумент не передали:

```python run
def greet(name, greeting="Здравствуйте"):
    print(f"{greeting}, {name}!")

greet("Ойбек")
greet("Ойбек", "Салом")
greet("Ойбек", greeting="Добрый вечер")
```

Параметры со значением по умолчанию пишут **после** обычных. Не делайте значением по умолчанию список или словарь
(`def f(items=[])`): один и тот же список будет переходить из вызова в вызов. Вместо этого пишут `items=None` и внутри
функции создают новый список.

## *args — любое количество аргументов

Звёздочка перед параметром собирает все «лишние» позиционные аргументы в **кортеж**:

```python run
def longest(*words):
    best = ""
    for w in words:
        if len(w) > len(best):
            best = w
    return best

print(longest("кот", "бегемот", "ёж"))
print(longest())
```

Обратная операция — распаковка списка при вызове: `longest(*["a", "bb"])` то же, что `longest("a", "bb")`.

## **kwargs — любые именованные аргументы

Две звёздочки собирают именованные аргументы в **словарь**:

```python run
def profile(**info):
    for key, value in info.items():
        print(f"{key} = {value}")

profile(name="Лола", city="Ургенч", age=19)
```

Словарь можно распаковать в именованные аргументы: `profile(**{"name": "Лола"})`.

## Только по имени

Параметры после `*args` можно передать **только по имени** — так делают «настройки»:

```python run
def join_words(*words, sep=" "):
    return sep.join(words)

print(join_words("раз", "два", "три", sep=" → "))
```

## Порядок параметров

`def f(a, b, *args, option=1, **kwargs)` — обычные, затем `*args`, затем параметры только по имени, затем `**kwargs`.

## Форматирование чисел

Пригодится в задачах: f-строка умеет разделять разряды — `f"{1234567:,}"` даёт `1,234,567`, а `.replace(",", " ")`
превращает запятые в пробелы; `f"{x:.2f}"` — ровно два знака после точки.
'''
TASKS = [
    {'id': 'args-01', 'title': 'Степень по умолчанию', 'statement': 'Напишите функцию power(x, n=2), возвращающую x в степени n. Дано k строк (первая строка — k): в каждой одно число x или два числа «x n». Для каждой выведите power с одним или двумя аргументами.',
     'solution': 'def power(x, n=2):\n    return x ** n\n\nk = int(input())\nfor _ in range(k):\n    parts = list(map(int, input().split()))\n    print(power(*parts))', 'inputs': [['3', '5', '2 10', '3 3'], ['1', '-4']], 'require': ['def:power']},
    {'id': 'args-02', 'title': 'Сумма любого количества', 'statement': 'Напишите функцию total(*nums), которая циклом считает сумму всех аргументов (без sum). Даны числа через пробел (может быть пустая строка) — выведите total от них.',
     'solution': 'def total(*nums):\n    s = 0\n    for x in nums:\n        s += x\n    return s\n\nprint(total(*map(int, input().split())))', 'inputs': [['1 2 3'], [''], ['10'], ['-5 5 7']], 'require': ['def:total'], 'forbid': ['sum']},
    {'id': 'args-03', 'title': 'Цена с разрядами', 'statement': 'Напишите функцию format_price(value, currency="сум"), которая возвращает строку с разделением разрядов пробелами и валютой: 1250000 → «1 250 000 сум». Дано n строк (первая — n): «число» или «число валюта».',
     'solution': 'def format_price(value, currency="сум"):\n    return f"{value:,}".replace(",", " ") + " " + currency\n\nn = int(input())\nfor _ in range(n):\n    parts = input().split()\n    if len(parts) == 1:\n        print(format_price(int(parts[0])))\n    else:\n        print(format_price(int(parts[0]), parts[1]))', 'inputs': [['3', '1250000', '999 USD', '1000000000'], ['1', '5 EUR']], 'require': ['def:format_price']},
    {'id': 'args-04', 'title': 'Анкета', 'statement': 'Напишите функцию card(**info), которая выводит строки «ключ: значение» в порядке передачи. Дано n и n строк вида «ключ=значение» — соберите их в словарь и вызовите card(**словарь).',
     'solution': 'def card(**info):\n    for key, value in info.items():\n        print(f"{key}: {value}")\n\nn = int(input())\ndata = {}\nfor _ in range(n):\n    key, value = input().split("=", 1)\n    data[key] = value\ncard(**data)', 'inputs': [['3', 'name=Азиз', 'city=Хива', 'age=18'], ['1', 'note=a=b']], 'require': ['def:card']},
    {'id': 'args-05', 'title': 'Среднее с точностью', 'statement': 'Напишите функцию average(*nums, digits=2), возвращающую среднее аргументов, округлённое до digits знаков (если чисел нет — 0). Первая строка — точность, вторая — числа через пробел. Если точность пустая строка, вызовите без digits.',
     'solution': 'def average(*nums, digits=2):\n    if not nums:\n        return 0\n    s = 0\n    for x in nums:\n        s += x\n    return round(s / len(nums), digits)\n\nd = input()\nnums = list(map(float, input().split()))\nif d == "":\n    print(average(*nums))\nelse:\n    print(average(*nums, digits=int(d)))', 'inputs': [['', '1 2 2'], ['0', '1 2 2'], ['3', '10 3'], ['', '']], 'require': ['def:average']},
]
