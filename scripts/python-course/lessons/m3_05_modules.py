DIR = 'm3/05-modules'
THEORY = r'''
# Модули и импорт

**Модуль** — файл с кодом на Python, функции и переменные которого можно использовать в другой программе. С Python
идёт **стандартная библиотека** — сотни готовых модулей: математика, даты, случайные числа, работа с файлами и текстом.

## Способы импорта

```python run
import math
print(math.sqrt(16), math.pi)

from math import floor, ceil
print(floor(2.7), ceil(2.1))

import statistics as st
print(st.mean([2, 4, 9]))
```

| Запись | Как обращаться |
| --- | --- |
| `import math` | `math.sqrt(x)` — через имя модуля |
| `from math import sqrt` | `sqrt(x)` — напрямую |
| `import statistics as st` | `st.mean(...)` — под коротким именем |

`from math import *` (импорт всего) лучше не писать: непонятно, откуда взялось имя, и имена могут перекрыть ваши.

## Полезные модули

| Модуль | Что умеет |
| --- | --- |
| `math` | `sqrt`, `ceil`, `floor`, `pi`, `factorial`, `gcd`, `hypot`, `sin`, `cos` |
| `statistics` | `mean`, `median`, `mode` |
| `collections` | `Counter` — подсчёт, `defaultdict`, `deque` |
| `string` | наборы символов: `ascii_letters`, `digits`, `punctuation` |
| `itertools` | `permutations`, `combinations`, `product` |
| `random`, `datetime` | случайность и даты — в следующем уроке |

```python run
from collections import Counter
c = Counter("абракадабра")
print(c.most_common(2))
```

## Свой модуль

Любой ваш файл `.py` — уже модуль. Если рядом с программой лежит `geometry.py` с функцией `circle_area`, её
подключают так же: `from geometry import circle_area`. Так большую программу раскладывают по файлам.

Код модуля выполняется при первом импорте. Чтобы часть кода работала **только** при прямом запуске файла, а не при
импорте, её кладут под проверку:

```python run
def main():
    print("запущен как программа")

if __name__ == "__main__":
    main()
```

## Где искать

Документация стандартной библиотеки — docs.python.org/3/library. Встроенная справка: `help(math)`, список имён
модуля — `dir(math)`.
'''
TASKS = [
    {'id': 'mod-01', 'title': 'Гипотенуза', 'statement': 'Даны катеты прямоугольного треугольника. С помощью модуля math выведите гипотенузу, округлённую до трёх знаков.',
     'solution': 'import math\n\na = float(input())\nb = float(input())\nprint(round(math.hypot(a, b), 3))', 'inputs': [['3', '4'], ['1', '1'], ['5.5', '2']], 'require': ['import:math']},
    {'id': 'mod-02', 'title': 'Сколько автобусов', 'statement': 'Даны число людей и вместимость автобуса. Выведите, сколько автобусов нужно (округление вверх) — функцией из модуля math, без if.',
     'solution': 'from math import ceil\n\npeople = int(input())\ncap = int(input())\nprint(ceil(people / cap))', 'inputs': [['100', '30'], ['90', '30'], ['1', '50'], ['0', '10']], 'require': ['import:math']},
    {'id': 'mod-03', 'title': 'Среднее и медиана', 'statement': 'Даны числа через пробел. С помощью модуля statistics выведите среднее и медиану, каждое округлив до двух знаков, через пробел.',
     'solution': 'import statistics\n\nnums = list(map(float, input().split()))\nprint(round(statistics.mean(nums), 2), round(statistics.median(nums), 2))', 'inputs': [['1 2 3 4'], ['5 1 9'], ['2.5 2.5 10']], 'require': ['import:statistics']},
    {'id': 'mod-04', 'title': 'Три частых слова', 'statement': 'Дан текст (слова через пробел, регистр не важен). С помощью collections.Counter выведите три самых частых слова в формате «слово: число» (при равенстве — по порядку первого появления).',
     'solution': 'from collections import Counter\n\nc = Counter(input().lower().split())\nfor word, k in c.most_common(3):\n    print(f"{word}: {k}")', 'inputs': [['кот пёс кот мышь пёс кот сыр'], ['a b c d'], ['Да да ДА нет']], 'require': ['import:collections']},
    {'id': 'mod-05', 'title': 'Состав пароля', 'statement': 'Дан пароль. С помощью модуля string посчитайте и выведите четыре строки: «Букв: …», «Цифр: …», «Знаков: …» (string.punctuation), «Других: …».',
     'solution': 'import string\n\np = input()\nletters = digits = punct = other = 0\nfor ch in p:\n    if ch in string.ascii_letters:\n        letters += 1\n    elif ch in string.digits:\n        digits += 1\n    elif ch in string.punctuation:\n        punct += 1\n    else:\n        other += 1\nprint(f"Букв: {letters}")\nprint(f"Цифр: {digits}")\nprint(f"Знаков: {punct}")\nprint(f"Других: {other}")', 'inputs': [['Pa$$w0rd!'], ['12345'], ['пароль 1']], 'require': ['import:string']},
    {'id': 'mod-06', 'title': 'Анаграммы', 'statement': 'Дано короткое слово (до 6 букв). С помощью itertools.permutations выведите все различные перестановки его букв по алфавиту, каждую с новой строки, и в конце — «Всего: <количество>».',
     'solution': 'from itertools import permutations\n\nword = input()\nvariants = sorted(set("".join(p) for p in permutations(word)))\nfor v in variants:\n    print(v)\nprint(f"Всего: {len(variants)}")', 'inputs': [['кот'], ['аа'], ['abc'], ['мама']], 'require': ['import:itertools']},
]
