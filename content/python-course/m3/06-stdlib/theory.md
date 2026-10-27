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
