DIR = 'm2/10-collections-practice'
THEORY = r'''
# Практика: списки, циклы, словари

В этом уроке задачи посложнее: нужно сочетать списки, циклы, словари и условия. Почти любая такая задача решается
одним из нескольких **шаблонов**.

## Шаблон 1. Пройти и накопить

Сумма, количество, произведение — переменная до цикла, обновление в цикле:

```python run
weights = [3, 7, 2, 9]
heavy = 0
for w in weights:
    if w > 5:
        heavy += 1
print("тяжёлых:", heavy)
```

## Шаблон 2. Пройти и запомнить лучшее

Наибольшее, наименьшее, самое длинное слово — храним «лучшее на данный момент». Если нужно **второе по величине**,
храним два значения и аккуратно обновляем оба:

```text
если x > первое:      второе ← первое; первое ← x
иначе если x > второе (и x ≠ первое): второе ← x
```

## Шаблон 3. Сгруппировать словарём

Ключ — признак группы, значение — список или сумма:

```python run
words = ["арбуз", "банан", "айва", "вишня", "абрикос"]
groups = {}
for w in words:
    first = w[0]
    if first not in groups:
        groups[first] = []
    groups[first].append(w)
print(groups)
```

## Шаблон 4. Отфильтровать в новый список

```python run
nums = [5, -2, 8, 0, -7]
positive = []
for x in nums:
    if x > 0:
        positive.append(x)
print(positive)
```

## Несколько строк ввода

Частый формат: в первой строке `n`, затем `n` строк данных. Читаем `n`, потом в цикле `for _ in range(n)` —
по строке (`_` — имя переменной, которая не нужна).

## Ввод с ошибками

Если среди данных могут быть некорректные строки, `try/except` ставят **внутри** цикла — тогда одна плохая строка не
остановит обработку остальных.
'''
TASKS = [
    {'id': 'coll-01', 'title': 'Самый частый элемент', 'statement': 'Дано n, затем n целых чисел через пробел. Выведите через пробел число, которое встречается чаще всего, и сколько раз оно встретилось. Если таких чисел несколько — наименьшее из них. Без max, min, count, sorted.',
     'solution': 'n = int(input())\nnums = list(map(int, input().split()))\nfreq = {}\nfor x in nums:\n    freq[x] = freq.get(x, 0) + 1\nbest = None\nfor x, k in freq.items():\n    if best is None or k > freq[best] or (k == freq[best] and x < best):\n        best = x\nprint(best, freq[best])',
     'inputs': [['7', '1 3 2 3 1 3 2'], ['4', '5 5 7 7'], ['1', '42'], ['6', '-1 -1 2 2 0 0'], ['5', '9 8 7 6 5']], 'forbid': ['max', 'min', '.count', 'sorted', '.sort', 'import:collections']},
    {'id': 'coll-02', 'title': 'Второй по величине', 'statement': 'Даны целые числа через пробел (хотя бы два разных). Выведите второе по величине значение — наибольшее среди чисел, меньших максимума. За один проход, без max, sorted, set.',
     'solution': 'nums = list(map(int, input().split()))\nfirst = None\nsecond = None\nfor x in nums:\n    if first is None or x > first:\n        if first is not None:\n            second = first\n        first = x\n    elif x != first and (second is None or x > second):\n        second = x\nprint(second)',
     'inputs': [['3 9 2 9 7'], ['1 2'], ['5 5 4'], ['-3 -1 -2'], ['10 20 30 40 30']], 'forbid': ['max', 'sorted', '.sort', 'set', 'min']},
    {'id': 'coll-03', 'title': 'Стоимость склада', 'statement': 'Дано n, затем n строк «товар количество цена». Выведите общую стоимость склада, а во второй строке — товар с наибольшей стоимостью запаса (количество × цена); при равенстве — первый.',
     'solution': 'n = int(input())\ntotal = 0\nbest = None\nbest_value = 0\nfor _ in range(n):\n    name, k, price = input().split()\n    value = int(k) * int(price)\n    total += value\n    if best is None or value > best_value:\n        best = name\n        best_value = value\nprint(total)\nprint(best)',
     'inputs': [['3', 'ручки 100 2000', 'тетради 50 5000', 'клей 10 7000'], ['1', 'мел 5 1000'], ['2', 'a 2 5', 'b 5 2']], 'forbid': ['max', 'sorted']},
    {'id': 'coll-04', 'title': 'Слова по первой букве', 'statement': 'Дана строка слов через пробел. Сгруппируйте слова по первой букве: для каждой буквы в порядке первого появления выведите «буква: слова через запятую и пробел» (слова — в порядке появления).',
     'solution': 'groups = {}\nfor w in input().split():\n    groups.setdefault(w[0], []).append(w)\nfor letter, ws in groups.items():\n    print(f"{letter}: {\', \'.join(ws)}")',
     'inputs': [['арбуз банан айва вишня абрикос'], ['кот'], ['да нет да нет'], ['python pascal java c perl']]},
    {'id': 'coll-05', 'title': 'Общие элементы', 'statement': 'Даны два списка чисел (каждый в своей строке). Выведите через пробел числа, которые есть в обоих списках, — в порядке первого списка и без повторов. Если общих нет — «Нет общих». Множества (set) не используйте.',
     'solution': 'a = input().split()\nb = input().split()\nseen = {}\nfor x in b:\n    seen[x] = True\nout = []\nfor x in a:\n    if x in seen and x not in out:\n        out.append(x)\nprint(" ".join(out) if out else "Нет общих")',
     'inputs': [['1 2 3 4 2', '4 2 9'], ['1 2', '3 4'], ['5 5 5', '5'], ['7 8 9', '9 8 7']], 'forbid': ['set']},
    {'id': 'coll-06', 'title': 'Сумма чётных с проверкой', 'statement': 'Дано n, затем n строк. Найдите сумму всех чётных целых чисел среди них. Для каждой строки, которая не является целым числом, выведите «Ошибка: \'<строка>\' не является целым числом», а в конце — сумму.',
     'solution': 'n = int(input())\ntotal = 0\nfor _ in range(n):\n    s = input()\n    try:\n        x = int(s)\n    except ValueError:\n        print(f"Ошибка: \'{s}\' не является целым числом")\n        continue\n    if x % 2 == 0:\n        total += x\nprint(total)',
     'inputs': [['5', '2', 'abc', '4', '5', '10'], ['3', '1', '3', '5'], ['4', 'x', 'y', '-2', '7.0'], ['1', '0']], 'require': ['try', 'for']},
]

# Задачи, перенесённые из заданий «Объекты и словари» (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyd-02', 'title': 'Звонок по имени', 'statement': 'Даны две строки одинаковой длины: имена через пробел и номера телефонов через пробел, затем имя для звонка. Соберите словарь «имя → телефон» циклом по номерам позиций (без zip и dict(…)) и выведите номер контакта или «не найден». Решение — на Python, данные храните в словаре (dict).', 'solution': 'names = input().split()\nphones = input().split()\nbook = {}\nfor i in range(len(names)):\n    book[names[i]] = phones[i]\nprint(book.get(input(), "не найден"))', 'inputs': [['Аня Боря Витя', '8901 8902 8903', 'Боря'], ['Аня Боря Витя', '8901 8902 8903', 'Гена'], ['Лола', '777', 'Лола']], 'forbid': ['zip', 'dict']},
    {'id': 'pyd-03', 'title': 'Прайс-лист и заказ', 'statement': 'Даны три строки: названия товаров через пробел, их цены через пробел (в том же порядке) и заказ — названия через пробел, возможно с повторами (все они есть в прайсе). Соберите словарь «товар → цена», посчитайте стоимость заказа и выведите «Итого: N». Решение — на Python, данные храните в словаре (dict).', 'solution': 'names = input().split()\nprices = input().split()\nprice = {}\nfor i in range(len(names)):\n    price[names[i]] = int(prices[i])\ntotal = 0\nfor item in input().split():\n    total += price[item]\nprint(f"Итого: {total}")', 'inputs': [['хлеб молоко сыр', '40 70 350', 'хлеб сыр хлеб'], ['чай', '15', 'чай чай чай чай'], ['a b c', '1 10 100', 'c b a c']]},
    {'id': 'pyd-04', 'title': 'Оценки группы', 'statement': 'Дано число n, затем n строк «имя балл» (имена разные). Сохраните их в словаре «имя → балл» и выведите: «Среднее: …» (round до 2 знаков), «Лучший: имя» (при равенстве — кто раньше), «Ниже среднего: имена через запятую с пробелом» в порядке ввода или «Ниже среднего: нет». Без max и sum. Решение — на Python, данные храните в словаре (dict).', 'solution': 'n = int(input())\nscores = {}\nfor _ in range(n):\n    name, s = input().split()\n    scores[name] = int(s)\ntotal = 0\nbest = None\nfor name, s in scores.items():\n    total += s\n    if best is None or s > scores[best]:\n        best = name\navg = total / n\nlow = []\nfor name, s in scores.items():\n    if s < avg:\n        low.append(name)\nprint(f"Среднее: {round(avg, 2)}")\nprint(f"Лучший: {best}")\nprint("Ниже среднего: " + (", ".join(low) if low else "нет"))', 'inputs': [['3', 'Аня 4', 'Боря 5', 'Витя 3'], ['2', 'Оля 5', 'Катя 5'], ['4', 'Али 70', 'Бек 95', 'Ян 60', 'Ким 95']], 'forbid': ['max', 'sum']},
    {'id': 'pyd-08', 'title': 'Объединение складов', 'statement': 'Дано число n и n строк «товар количество» первого склада, затем число m и m строк второго склада. Соберите один словарь «товар → общее количество» и в порядке первого появления выведите «товар — количество». Решение — на Python, данные храните в словаре (dict).', 'solution': 'total = {}\nfor _ in range(2):\n    for _ in range(int(input())):\n        name, k = input().split()\n        total[name] = total.get(name, 0) + int(k)\nfor name, k in total.items():\n    print(f"{name} — {k}")', 'inputs': [['2', 'яблоко 5', 'банан 3', '2', 'яблоко 2', 'киви 7'], ['0', '1', 'мыло 4'], ['3', 'а 1', 'б 1', 'а 1', '2', 'б 5', 'в 0']]},
]
