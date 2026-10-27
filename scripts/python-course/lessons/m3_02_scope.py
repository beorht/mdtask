DIR = 'm3/02-scope'
THEORY = r'''
# Область видимости

**Область видимости** — часть программы, где имя переменной что-то значит.

## Локальные переменные

Переменные, созданные **внутри** функции (и её параметры), — **локальные**: они существуют только во время работы
функции и не видны снаружи.

```python run
def calc():
    result = 2 + 2
    print("внутри:", result)

calc()
try:
    print(result)
except NameError:
    print("снаружи result не видна")
```

Каждый вызов функции получает свои, новые локальные переменные.

## Глобальные переменные

Переменные, созданные в основном коде программы, — **глобальные**. Функция может их **читать**:

```python run
RATE = 12750

def to_sum(dollars):
    print(dollars * RATE)

to_sum(10)
```

Но если внутри функции **присвоить** значение глобальному имени, Python создаст новую локальную переменную с тем же
именем, а глобальная не изменится:

```python run
count = 0

def add():
    count = 5
    print("внутри:", count)

add()
print("снаружи:", count)
```

## global

Чтобы функция меняла глобальную переменную, её объявляют `global`:

```python run
visits = 0

def visit():
    global visits
    visits += 1

visit()
visit()
print(visits)
```

## Почему global лучше не злоупотреблять

Функция, меняющая глобальные переменные, зависит от всей программы: её трудно проверить и переиспользовать. Хорошая
функция получает всё нужное **через параметры** и отдаёт результат наружу (это — в уроке о `return`). `global` уместен
для настроек и простых счётчиков; константы (значения, которые не меняются) называют БОЛЬШИМИ буквами: `TAX = 12`.

## Изменяемые объекты

Список, переданный в функцию, — **тот же самый** список: если функция добавит в него элемент, это будет видно снаружи,
и `global` для этого не нужен.

```python run
history = []

def remember(item):
    history.append(item)

remember("чай")
remember("кофе")
print(history)
```
'''
TASKS = [
    {'id': 'scope-01', 'title': 'Счётчик вызовов', 'statement': 'Напишите функцию hello(), которая выводит «Привет!» и увеличивает глобальный счётчик вызовов. Дано n — вызовите функцию n раз и выведите «Вызовов: <счётчик>».',
     'solution': 'calls = 0\n\ndef hello():\n    global calls\n    print("Привет!")\n    calls += 1\n\nn = int(input())\nfor _ in range(n):\n    hello()\nprint(f"Вызовов: {calls}")', 'inputs': [['3'], ['0'], ['1']], 'require': ['def:hello']},
    {'id': 'scope-02', 'title': 'Кошелёк', 'statement': 'Глобальная переменная balance (в начале 0). Функции deposit(x) — положить x, withdraw(x) — снять x или вывести «Недостаточно средств», если денег не хватает. Команды «+сумма» и «-сумма» вводятся по одной до команды «стоп»; потом выведите «Баланс: <balance>».',
     'solution': 'balance = 0\n\ndef deposit(x):\n    global balance\n    balance += x\n\ndef withdraw(x):\n    global balance\n    if x > balance:\n        print("Недостаточно средств")\n    else:\n        balance -= x\n\nwhile True:\n    cmd = input()\n    if cmd == "стоп":\n        break\n    if cmd[0] == "+":\n        deposit(int(cmd[1:]))\n    else:\n        withdraw(int(cmd[1:]))\nprint(f"Баланс: {balance}")',
     'inputs': [['+100', '-30', '-100', '+5', 'стоп'], ['стоп'], ['-1', 'стоп'], ['+50', '-50', 'стоп']], 'require': ['def:deposit', 'def:withdraw']},
    {'id': 'scope-03', 'title': 'Журнал операций', 'statement': 'Заведите глобальный список log. Функция add(text) добавляет запись в log, функция show() выводит все записи с номерами: «1. текст». Дано n и n записей — добавьте их и вызовите show().',
     'solution': 'log = []\n\ndef add(text):\n    log.append(text)\n\ndef show():\n    for i, text in enumerate(log, 1):\n        print(f"{i}. {text}")\n\nn = int(input())\nfor _ in range(n):\n    add(input())\nshow()', 'inputs': [['3', 'вход', 'покупка', 'выход'], ['1', 'тест']], 'require': ['def:add', 'def:show']},
    {'id': 'scope-04', 'title': 'Цена с налогом', 'statement': 'Задайте константу TAX = 12 (процентов). Функция print_price(name, price) выводит «<name>: <цена с налогом>», округлив до двух знаков. Дано n и n строк «название цена».',
     'solution': 'TAX = 12\n\ndef print_price(name, price):\n    print(f"{name}: {round(price * (100 + TAX) / 100, 2)}")\n\nn = int(input())\nfor _ in range(n):\n    name, price = input().split()\n    print_price(name, float(price))', 'inputs': [['2', 'чай 10000', 'торт 85000'], ['1', 'жвачка 999.5']], 'require': ['def:print_price']},
    {'id': 'scope-05', 'title': 'Наибольшее без глобальных', 'statement': 'Напишите функцию print_max(nums), которая выводит наибольшее число списка, найдя его циклом (без max, sorted и без глобальных переменных внутри функции). Дано m строк, в каждой — числа через пробел; первая строка — m.',
     'solution': 'def print_max(nums):\n    best = nums[0]\n    for x in nums:\n        if x > best:\n            best = x\n    print(best)\n\nm = int(input())\nfor _ in range(m):\n    print_max(list(map(int, input().split())))', 'inputs': [['2', '3 9 2', '-5 -1'], ['1', '7']], 'require': ['def:print_max'], 'forbid': ['max', 'sorted', '.sort']},
]
