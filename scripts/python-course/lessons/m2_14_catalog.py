DIR = 'm2/14-catalog'
THEORY = r'''
# Мини-проект «Каталог продуктов»

Итог модуля — программа учёта товаров магазина. В каталоге у каждого продукта есть **название**, **категория** и
**цена**. Мы шаг за шагом научим программу считать итоги, искать, фильтровать и, наконец, выполнять команды.

## Как хранить каталог

Удобно хранить каталог **списком словарей** — каждый продукт словарь с одинаковыми ключами:

```python run
catalog = [
    {"name": "молоко", "category": "молочное", "price": 12000},
    {"name": "сыр", "category": "молочное", "price": 45000},
]
for item in catalog:
    print(item["name"], item["price"])
```

Другой вариант — словарь «название → (категория, цена)», если названия уникальны. Выбирайте то, что удобнее для задачи.

## Чтение каталога

Формат ввода во всех задачах: число `n`, затем `n` строк «название категория цена» (название и категория — одно
слово). Чтение — цикл `for _ in range(n)`, строка разбивается `split()`, цена переводится в `int`.

## Поиск без учёта регистра

Пользователь может ввести «Молоко», а в каталоге «молоко». Перед сравнением обе строки приводят к нижнему регистру.
Проверка «содержит ли строка подстроку» — оператор `in` для строк: `"мол" in "молоко"` → `True`.

## Итоги по группам

Сумма цен по категориям — словарь «категория → сумма», как в уроке о словарях. Для вывода по алфавиту ключи
сортируют: `for cat in sorted(totals):`.

## Команды

Последняя задача — «живая» программа: она читает команды, пока не встретит `стоп`. Удобно сделать главный цикл
`while True` и внутри разбирать первое слово команды через `if … elif …`.
'''
CATALOG = ['5', 'молоко молочное 12000', 'сыр молочное 45000', 'хлеб выпечка 4000', 'кефир молочное 11000', 'батон выпечка 6000']
SMALL = ['3', 'чай напитки 20000', 'сок напитки 15000', 'печенье сладкое 9000']
READ = 'n = int(input())\ncatalog = []\nfor _ in range(n):\n    name, cat, price = input().split()\n    catalog.append({"name": name, "category": cat, "price": int(price)})\n'
TASKS = [
    {'id': 'cat-01', 'title': 'Загрузка каталога', 'statement': 'Прочитайте каталог и выведите две строки: «Товаров: <количество>» и «Сумма цен: <сумма>».',
     'solution': READ + 'total = 0\nfor item in catalog:\n    total += item["price"]\nprint(f"Товаров: {len(catalog)}")\nprint(f"Сумма цен: {total}")', 'inputs': [CATALOG, SMALL, ['1', 'вода напитки 3000']]},
    {'id': 'cat-02', 'title': 'Поиск по названию', 'statement': 'После каталога — строка поиска. Выведите в порядке каталога «название — цена» для всех товаров, в названии которых есть эта строка (без учёта регистра), или «Ничего не найдено».',
     'solution': READ + 'q = input().lower()\nfound = False\nfor item in catalog:\n    if q in item["name"].lower():\n        print(f"{item[\'name\']} — {item[\'price\']}")\n        found = True\nif not found:\n    print("Ничего не найдено")',
     'inputs': [CATALOG + ['К'], CATALOG + ['бат'], SMALL + ['мясо'], SMALL + ['Ч']]},
    {'id': 'cat-03', 'title': 'Фильтр по категории и цене', 'statement': 'После каталога — категория и максимальная цена (каждая в своей строке). Выведите названия товаров этой категории не дороже указанной цены через запятую и пробел, в порядке каталога, или «Нет подходящих».',
     'solution': READ + 'cat = input()\nlimit = int(input())\nnames = []\nfor item in catalog:\n    if item["category"] == cat and item["price"] <= limit:\n        names.append(item["name"])\nprint(", ".join(names) if names else "Нет подходящих")',
     'inputs': [CATALOG + ['молочное', '20000'], CATALOG + ['выпечка', '10000'], CATALOG + ['мясо', '99999'], SMALL + ['напитки', '10000']]},
    {'id': 'cat-04', 'title': 'Самый дорогой и самый дешёвый', 'statement': 'Выведите две строки: «Дороже всего: <название> (<цена>)» и «Дешевле всего: <название> (<цена>)». При равных ценах — товар, который в каталоге раньше. Без max, min, sorted.',
     'solution': READ + 'hi = catalog[0]\nlo = catalog[0]\nfor item in catalog:\n    if item["price"] > hi["price"]:\n        hi = item\n    if item["price"] < lo["price"]:\n        lo = item\nprint(f"Дороже всего: {hi[\'name\']} ({hi[\'price\']})")\nprint(f"Дешевле всего: {lo[\'name\']} ({lo[\'price\']})")',
     'inputs': [CATALOG, SMALL, ['2', 'a x 5', 'b x 5']], 'forbid': ['max', 'min', 'sorted', '.sort']},
    {'id': 'cat-05', 'title': 'Итог по категориям', 'statement': 'Для каждой категории (по алфавиту) выведите «категория: количество товаров, сумма цен» в виде «молочное: 3 шт., 68000».',
     'solution': READ + 'count = {}\ntotal = {}\nfor item in catalog:\n    c = item["category"]\n    count[c] = count.get(c, 0) + 1\n    total[c] = total.get(c, 0) + item["price"]\nfor c in sorted(count):\n    print(f"{c}: {count[c]} шт., {total[c]}")',
     'inputs': [CATALOG, SMALL, ['1', 'вода напитки 3000']]},
    {'id': 'cat-06', 'title': 'Каталог с командами', 'statement': 'После каталога идут команды, по одной в строке, до команды «стоп»:\n\n- «добавить название категория цена» — добавить товар, вывести «Добавлено»;\n- «удалить название» — удалить товар, вывести «Удалено» или «Нет такого товара»;\n- «цена название» — вывести цену или «Нет такого товара»;\n- «итого» — вывести «Товаров: <k>, на сумму <s>».\n\nНа неизвестную команду выведите «Неизвестная команда». Названия товаров уникальны.',
     'solution': 'n = int(input())\nitems = {}\nfor _ in range(n):\n    name, cat, price = input().split()\n    items[name] = (cat, int(price))\nwhile True:\n    parts = input().split()\n    cmd = parts[0]\n    if cmd == "стоп":\n        break\n    if cmd == "добавить":\n        items[parts[1]] = (parts[2], int(parts[3]))\n        print("Добавлено")\n    elif cmd == "удалить":\n        if parts[1] in items:\n            del items[parts[1]]\n            print("Удалено")\n        else:\n            print("Нет такого товара")\n    elif cmd == "цена":\n        if parts[1] in items:\n            print(items[parts[1]][1])\n        else:\n            print("Нет такого товара")\n    elif cmd == "итого":\n        total = 0\n        for cat, price in items.values():\n            total += price\n        print(f"Товаров: {len(items)}, на сумму {total}")\n    else:\n        print("Неизвестная команда")',
     'inputs': [SMALL + ['итого', 'цена сок', 'добавить торт сладкое 80000', 'итого', 'удалить чай', 'удалить чай', 'цена чай', 'купить сок', 'итого', 'стоп'],
                CATALOG + ['цена хлеб', 'стоп'], ['0', 'итого', 'добавить вода напитки 3000', 'итого', 'стоп']], 'require': ['while']},
]

# Задачи, перенесённые из заданий «Объекты и словари» (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyd-09', 'title': 'Товары по категориям', 'statement': 'Дано число n, затем n строк «название категория цена». Сгруппируйте товары в словарь «категория → список названий» и для каждой категории в порядке первого появления выведите «категория: товар1, товар2 — сумма S». Решение — на Python, данные храните в словаре (dict).', 'solution': 'n = int(input())\ngroups = {}\nsums = {}\nfor _ in range(n):\n    name, cat, price = input().split()\n    groups.setdefault(cat, []).append(name)\n    sums[cat] = sums.get(cat, 0) + int(price)\nfor cat, names in groups.items():\n    print(f"{cat}: {\', \'.join(names)} — сумма {sums[cat]}")', 'inputs': [['3', 'яблоко фрукты 50', 'морковь овощи 30', 'банан фрукты 40'], ['1', 'ручка канцелярия 5'], ['4', 'a x 1', 'b y 2', 'c x 3', 'd y 4']]},
    {'id': 'pyd-11', 'title': 'База студентов по группам', 'statement': 'Дано число n, затем n строк «имя группа балл». Постройте словарь «группа → список студентов» и для каждой группы в порядке первого появления выведите три строки: «Группа G: имя (балл), имя (балл)…», «Среднее: …» (round до 1 знака) и «Лучший: имя» (при равенстве — кто раньше). Решение — на Python, данные храните в словаре (dict).', 'solution': 'n = int(input())\ngroups = {}\nfor _ in range(n):\n    name, group, score = input().split()\n    groups.setdefault(group, []).append((name, int(score)))\nfor group, people in groups.items():\n    print(f"Группа {group}: " + ", ".join(f"{name} ({s})" for name, s in people))\n    total = 0\n    best = people[0]\n    for person in people:\n        total += person[1]\n        if person[1] > best[1]:\n            best = person\n    print(f"Среднее: {round(total / len(people), 1)}")\n    print(f"Лучший: {best[0]}")', 'inputs': [['3', 'Аня ИС-21 90', 'Боря ИС-21 75', 'Витя ПКС-22 80'], ['1', 'Ян IB 100'], ['4', 'А G1 70', 'Б G2 70', 'В G1 90', 'Г G2 71']]},
    {'id': 'pyd-14', 'title': 'Чек покупки', 'statement': 'Дано число n, затем n строк «товар количество цена» (один товар может встретиться несколько раз с той же ценой). Сгруппируйте покупки словарём и выведите чек: по строке на товар в порядке первого появления «товар K шт × цена = сумма», затем «ИТОГО: …», «Позиций: …» и «Штук: …». Решение — на Python, данные храните в словаре (dict).', 'solution': 'n = int(input())\nqty = {}\nprice = {}\nfor _ in range(n):\n    name, k, p = input().split()\n    qty[name] = qty.get(name, 0) + int(k)\n    price[name] = int(p)\ntotal = 0\npieces = 0\nfor name, k in qty.items():\n    line = k * price[name]\n    total += line\n    pieces += k\n    print(f"{name} {k} шт × {price[name]} = {line}")\nprint(f"ИТОГО: {total}")\nprint(f"Позиций: {len(qty)}")\nprint(f"Штук: {pieces}")', 'inputs': [['3', 'яблоко 3 50', 'яблоко 2 50', 'сыр 1 350'], ['1', 'хлеб 1 40'], ['4', 'ручка 10 5', 'тетрадь 3 12', 'ручка 5 5', 'ластик 1 3']]},
]
