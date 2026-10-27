DIR = 'm2/09-dicts'
THEORY = r'''
# Словари

**Словарь** (`dict`) хранит пары **ключ → значение**. По ключу значение находится сразу, без перебора — как слово в
настоящем словаре или телефон по имени в контактах.

```python run
phones = {"Али": "901112233", "Нигора": "935557788"}
print(phones["Нигора"])
phones["Бек"] = "977001122"     # добавить новую пару
phones["Али"] = "900000000"     # заменить значение
print(phones)
print(len(phones))
```

Ключи уникальны: при повторном присваивании старое значение заменяется. Ключом может быть строка, число, кортеж;
значением — что угодно.

## Есть ли ключ

`key in d` — проверка ключа. Обращение к отсутствующему ключу (`d["Нет"]`) — ошибка `KeyError`. Безопаснее
метод `get`: `d.get(key)` вернёт `None`, `d.get(key, 0)` — значение по умолчанию.

```python run
stock = {"яблоки": 10}
print("груши" in stock, stock.get("груши", 0))
```

## Перебор словаря

```python run
prices = {"чай": 8000, "кофе": 15000, "сок": 12000}
for name in prices:
    print(name, prices[name])
for name, price in prices.items():
    print(f"{name}: {price}")
```

`keys()` — ключи, `values()` — значения, `items()` — пары. Порядок перебора — порядок добавления ключей.

## Подсчёт — самый частый приём

Словарь-счётчик: если ключ встретился впервые — заводим его с 1, иначе прибавляем 1.

```python run input=a b a c b a
counts = {}
for w in input().split():
    if w in counts:
        counts[w] += 1
    else:
        counts[w] = 1
print(counts)
```

То же короче: `freq[key] = freq.get(key, 0) + 1`.

## Удаление

`del d[key]` или `d.pop(key)` — удалить пару (если ключа нет — `KeyError`, у `pop` можно задать значение по умолчанию).
'''
TASKS = [
    {'id': 'dict-01', 'title': 'Телефонная книга', 'statement': 'Дано число n, затем n строк «имя телефон», затем имя для поиска. Выведите телефон этого человека или «Не найден».',
     'solution': 'n = int(input())\nbook = {}\nfor _ in range(n):\n    name, phone = input().split()\n    book[name] = phone\nq = input()\nprint(book.get(q, "Не найден"))',
     'inputs': [['3', 'Али 901', 'Вали 902', 'Гани 903', 'Вали'], ['2', 'Аня 1', 'Оля 2', 'Катя'], ['1', 'Бек 777', 'Бек'], ['3', 'Али 1', 'Али 2', 'Бо 3', 'Али']]},
    {'id': 'dict-02', 'title': 'Сколько каждой буквы', 'statement': 'Дано слово. Для каждой буквы в порядке первого появления выведите «буква: количество». Метод count не используйте — считайте словарём.',
     'solution': 'word = input()\ncounts = {}\nfor ch in word:\n    counts[ch] = counts.get(ch, 0) + 1\nfor ch, k in counts.items():\n    print(f"{ch}: {k}")', 'inputs': [['банан'], ['python'], ['ааа'], ['колокол']], 'forbid': ['.count', 'import:collections']},
    {'id': 'dict-03', 'title': 'Частота слов', 'statement': 'Дана строка слов через пробел (регистр не важен). Выведите самое частое слово в нижнем регистре и сколько раз оно встретилось. Если таких несколько — то, что встретилось раньше. Без max и count.',
     'solution': 'counts = {}\nfor w in input().lower().split():\n    counts[w] = counts.get(w, 0) + 1\nbest = None\nfor w, k in counts.items():\n    if best is None or k > counts[best]:\n        best = w\nprint(best, counts[best])', 'inputs': [['кот пёс Кот мышь КОТ пёс'], ['a b c'], ['да нет нет да'], ['слово']], 'forbid': ['max', '.count', 'import:collections', 'sorted']},
    {'id': 'dict-04', 'title': 'Переводчик', 'statement': 'Дано число n, затем n строк «английское русское», затем фраза на английском (слова через пробел). Выведите перевод: каждое слово заменено русским, а неизвестные слова оставлены как есть.',
     'solution': 'n = int(input())\nd = {}\nfor _ in range(n):\n    en, ru = input().split()\n    d[en] = ru\nprint(" ".join(d.get(w, w) for w in input().split()))',
     'inputs': [['3', 'i я', 'love люблю', 'python питон', 'i love python'], ['2', 'cat кот', 'dog пёс', 'my cat and dog'], ['1', 'hello привет', 'hello hello world']]},
    {'id': 'dict-05', 'title': 'Обратный словарь', 'statement': 'Дано число n, затем n строк «страна столица». Затем название столицы. Выведите страну с этой столицей или «Нет данных». Постройте для этого словарь «столица → страна».',
     'solution': 'n = int(input())\nrev = {}\nfor _ in range(n):\n    country, capital = input().split()\n    rev[capital] = country\nprint(rev.get(input(), "Нет данных"))',
     'inputs': [['3', 'Узбекистан Ташкент', 'Казахстан Астана', 'Япония Токио', 'Токио'], ['2', 'Франция Париж', 'Италия Рим', 'Берлин'], ['1', 'Корея Сеул', 'Сеул']]},
    {'id': 'dict-06', 'title': 'Средний балл студентов', 'statement': 'Дано число n, затем n строк «имя оценка» (у одного студента может быть несколько оценок). Для каждого студента в порядке первого появления выведите «имя: средний балл» (округлить до двух знаков).',
     'solution': 'n = int(input())\nsums = {}\ncnt = {}\nfor _ in range(n):\n    name, mark = input().split()\n    sums[name] = sums.get(name, 0) + int(mark)\n    cnt[name] = cnt.get(name, 0) + 1\nfor name in sums:\n    print(f"{name}: {round(sums[name] / cnt[name], 2)}")',
     'inputs': [['5', 'Али 5', 'Вали 4', 'Али 3', 'Гани 5', 'Вали 5'], ['1', 'Оля 4'], ['3', 'Аня 5', 'Аня 4', 'Аня 4']]},
]

# Задачи, перенесённые из заданий «Объекты и словари» (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyd-01', 'title': 'Счётчик повторов', 'statement': 'Дана строка слов через пробел. Посчитайте словарём, сколько раз встречается каждое слово, и в порядке первого появления выведите «слово — N раз» или «слово — N раза» («раза», если N оканчивается на 2, 3, 4, но не на 12, 13, 14). Метод count не используйте. Решение — на Python, данные храните в словаре (dict).', 'solution': 'counts = {}\nfor w in input().split():\n    counts[w] = counts.get(w, 0) + 1\nfor w, k in counts.items():\n    form = "раза" if k % 10 in (2, 3, 4) and k % 100 not in (12, 13, 14) else "раз"\n    print(f"{w} — {k} {form}")', 'inputs': [['яблоко груша яблоко банан яблоко'], ['да да да да да нет'], ['а б а б а б а б а б а б а б а б а б а б а б а б']], 'forbid': ['.count', 'import:collections']},
    {'id': 'pyd-05', 'title': 'Гласные буквы', 'statement': 'Дана строка текста. Подсчитайте в словаре, сколько раз встречается каждая буква (регистр не важен). Затем в порядке первого появления выведите только гласные (а е ё и о у ы э ю я, для латиницы — a e i o u y) в виде «буква — количество». Если гласных нет — «Гласных нет». Решение — на Python, данные храните в словаре (dict).', 'solution': 'counts = {}\nfor ch in input().lower():\n    if ch.isalpha():\n        counts[ch] = counts.get(ch, 0) + 1\nfound = False\nfor ch, k in counts.items():\n    if ch in "аеёиоуыэюяaeiouy":\n        print(f"{ch} — {k}")\n        found = True\nif not found:\n    print("Гласных нет")', 'inputs': [['привет мир'], ['Ура, Python!'], ['ВСТРЧ 2026']], 'forbid': ['.count', 'import:collections']},
    {'id': 'pyd-06', 'title': 'Шифр подстановки', 'statement': 'Дано число n, затем n строк «символ замена» — словарь соответствий, затем строка текста. Замените каждый символ строки по словарю; символы, которых в словаре нет, оставьте как есть. Выведите результат. Решение — на Python, данные храните в словаре (dict).', 'solution': 'n = int(input())\ncode = {}\nfor _ in range(n):\n    a, b = input().split()\n    code[a] = b\nresult = ""\nfor ch in input():\n    result += code.get(ch, ch)\nprint(result)', 'inputs': [['6', 'п p', 'р r', 'и i', 'в v', 'е e', 'т t', 'привет'], ['3', 'а 1', 'б 2', 'в 3', 'баобаб в саду'], ['1', 'x y', 'без замен']]},
]
