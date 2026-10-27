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
