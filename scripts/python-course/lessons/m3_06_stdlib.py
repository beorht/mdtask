DIR = 'm3/06-stdlib'
THEORY = r'''
# random, math, datetime

## random — случайные числа

| Функция | Что даёт |
| --- | --- |
| `random.randint(a, b)` | целое от `a` до `b` включительно |
| `random.random()` | дробное от 0 до 1 |
| `random.choice(seq)` | случайный элемент |
| `random.sample(seq, k)` | `k` разных случайных элементов |
| `random.shuffle(lst)` | перемешать список на месте |

Компьютер выдаёт не настоящие, а **псевдослучайные** числа: их вычисляет алгоритм из начального числа — **зерна**
(seed). С одним и тем же зерном последовательность всегда одинакова — так программы со случайностью тестируют:

```python run
import random
random.seed(42)
print(random.randint(1, 100), random.choice(["a", "b", "c"]))
random.seed(42)
print(random.randint(1, 100), random.choice(["a", "b", "c"]))
```

В задачах зерно приходит во вводе — вызовите `random.seed(зерно)` **до** любых случайных функций и вызывайте их ровно
в том порядке, который указан в условии.

## math — ещё немного математики

`math.pi`, `math.sqrt`, `math.sin`/`math.cos` (угол — в радианах: `math.radians(градусы)`), `math.factorial`,
`math.log`, `math.isclose` — сравнение дробных чисел с допуском (`0.1 + 0.2 == 0.3` — `False`!).

```python run
import math
print(0.1 + 0.2 == 0.3, math.isclose(0.1 + 0.2, 0.3))
print(round(math.sin(math.radians(30)), 3))
```

## datetime — даты и время

```python run
from datetime import date, datetime, timedelta

d = date(2026, 10, 26)
print(d.year, d.month, d.day, d.weekday())   # weekday: 0 — понедельник
print(d + timedelta(days=10))
print((date(2027, 1, 1) - d).days)
print(d.strftime("%d.%m.%Y"))
print(datetime.strptime("09.05.2026", "%d.%m.%Y").date())
```

- `date(год, месяц, день)` — дата, `timedelta(days=…)` — промежуток;
- разность двух дат — `timedelta`, у неё есть `.days`;
- `strptime` — разобрать строку в дату по формату, `strftime` — дату в строку: `%d` день, `%m` месяц, `%Y` год,
  `%H:%M` часы и минуты;
- `date.today()` и `datetime.now()` — сегодняшняя дата и текущее время (в задачах их не используют: ответ менялся бы
  каждый день).
'''
TASKS = [
    {'id': 'std-01', 'title': 'Кубики', 'statement': 'Даны зерно и число бросков n. Вызовите random.seed(зерно), затем n раз random.randint(1, 6). Выведите результаты через пробел и во второй строке — их сумму.',
     'solution': 'import random\n\nrandom.seed(int(input()))\nn = int(input())\nrolls = [random.randint(1, 6) for _ in range(n)]\nprint(" ".join(map(str, rolls)))\nprint(sum(rolls))', 'inputs': [['42', '5'], ['1', '3'], ['2026', '10']], 'require': ['import:random']},
    {'id': 'std-02', 'title': 'Дежурный', 'statement': 'Даны зерно и список имён через пробел. Вызовите random.seed(зерно) и выберите дежурного одним вызовом random.choice по списку. Выведите «Сегодня дежурит <имя>».',
     'solution': 'import random\n\nrandom.seed(int(input()))\nnames = input().split()\nprint(f"Сегодня дежурит {random.choice(names)}")', 'inputs': [['7', 'Али Вали Гани Дина'], ['100', 'Аня Бек'], ['3', 'Соло']], 'require': ['import:random']},
    {'id': 'std-03', 'title': 'Перемешать карточки', 'statement': 'Даны зерно и слова через пробел. Вызовите random.seed(зерно), перемешайте список слов одним вызовом random.shuffle и выведите через пробел.',
     'solution': 'import random\n\nrandom.seed(int(input()))\nwords = input().split()\nrandom.shuffle(words)\nprint(" ".join(words))', 'inputs': [['1', 'раз два три четыре пять'], ['99', 'a b c'], ['5', 'одно']], 'require': ['import:random']},
    {'id': 'std-04', 'title': 'Сколько дней', 'statement': 'Даны две даты в формате ДД.ММ.ГГГГ. Выведите, сколько дней между ними (по модулю).',
     'solution': 'from datetime import datetime\n\na = datetime.strptime(input(), "%d.%m.%Y")\nb = datetime.strptime(input(), "%d.%m.%Y")\nprint(abs((b - a).days))', 'inputs': [['01.09.2026', '26.10.2026'], ['31.12.2026', '01.01.2026'], ['29.02.2024', '01.03.2024'], ['05.05.2025', '05.05.2025']], 'require': ['import:datetime']},
    {'id': 'std-05', 'title': 'День недели', 'statement': 'Дана дата ДД.ММ.ГГГГ. Выведите день недели по-русски (понедельник, вторник, …) и во второй строке — дату через 100 дней в том же формате.',
     'solution': 'from datetime import datetime, timedelta\n\nDAYS = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]\nd = datetime.strptime(input(), "%d.%m.%Y")\nprint(DAYS[d.weekday()])\nprint((d + timedelta(days=100)).strftime("%d.%m.%Y"))', 'inputs': [['26.10.2026'], ['01.01.2000'], ['29.02.2024']], 'require': ['import:datetime']},
    {'id': 'std-06', 'title': 'Тень от столба', 'statement': 'Даны высота столба (м) и угол солнца над горизонтом (в градусах). Длина тени = высота / tan(угол). Выведите её, округлив до двух знаков (используйте math.tan и math.radians).',
     'solution': 'import math\n\nh = float(input())\nangle = float(input())\nprint(round(h / math.tan(math.radians(angle)), 2))', 'inputs': [['10', '45'], ['3', '30'], ['5', '60'], ['1.8', '15']], 'require': ['import:math']},
]

# Задачи, перенесённые из банка задач Python (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyb-11', 'title': 'Генератор случайного пароля', 'statement': 'Дано число seed и длина пароля. Вызовите random.seed(seed). Напишите функцию generate_password(length): каждый символ — random.choice(string.ascii_letters + string.digits + string.punctuation). Выведите пароль. Решение — на Python.', 'solution': 'import random\nimport string\n\ndef generate_password(length):\n    alphabet = string.ascii_letters + string.digits + string.punctuation\n    password = ""\n    for _ in range(length):\n        password += random.choice(alphabet)\n    return password\n\nrandom.seed(int(input()))\nprint(generate_password(int(input())))', 'inputs': [['42', '12'], ['7', '8'], ['2026', '20']], 'require': ['import:random', 'import:string', 'def:generate_password']},
    {'id': 'pyb-12', 'title': 'Секундомер для вычислений', 'statement': 'Дано N (не меньше 100 000). Посчитайте сумму чисел от 1 до N двумя способами — циклом for и формулой N*(N+1)//2 — и время каждого через time.perf_counter(). Выведите «Цикл: S», «Формула: S» и «Формула быстрее: да» или «Формула быстрее: нет» (время сравнивайте, но не выводите). Решение — на Python.', 'solution': 'import time\n\nn = int(input())\nstart = time.perf_counter()\nloop_sum = 0\nfor k in range(1, n + 1):\n    loop_sum += k\nloop_time = time.perf_counter() - start\nstart = time.perf_counter()\nformula_sum = n * (n + 1) // 2\nformula_time = time.perf_counter() - start\nprint(f"Цикл: {loop_sum}")\nprint(f"Формула: {formula_sum}")\nprint("Формула быстрее: " + ("да" if formula_time < loop_time else "нет"))', 'inputs': [['100000'], ['500000'], ['1000000']], 'require': ['import:time', 'for']},
]
