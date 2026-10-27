DIR = 'm3/10-json'
THEORY = r'''
# JSON

**JSON** — текстовый формат для обмена данными. Им пользуются почти все веб-сервисы и многие программы для
настроек. Он очень похож на словари и списки Python:

```text
{"name": "Азиз", "age": 19, "langs": ["python", "sql"], "student": true, "phone": null}
```

| JSON | Python |
| --- | --- |
| объект `{…}` | словарь `dict` |
| массив `[…]` | список `list` |
| строка `"…"` (только двойные кавычки) | `str` |
| число | `int` / `float` |
| `true` / `false` / `null` | `True` / `False` / `None` |

## Модуль json

| Функция | Что делает |
| --- | --- |
| `json.loads(строка)` | JSON-строку → объект Python |
| `json.dumps(объект)` | объект → JSON-строку |
| `json.load(f)` | прочитать JSON из открытого файла |
| `json.dump(объект, f)` | записать JSON в открытый файл |

```python run
import json

data = {"city": "Ташкент", "temp": 18, "tags": ["солнце"]}
text = json.dumps(data, ensure_ascii=False)
print(text)
back = json.loads(text)
print(back["city"], back["tags"][0])
```

`ensure_ascii=False` оставляет русские буквы как есть (иначе они превратятся в `\u0422…`). `indent=2` — красивый
вывод с отступами, `sort_keys=True` — ключи по алфавиту.

## Сохранить и загрузить

```python run
import json

profile = {"name": "Мадина", "score": 95}
with open("profile.json", "w", encoding="utf-8") as f:
    json.dump(profile, f, ensure_ascii=False, indent=2)

with open("profile.json", encoding="utf-8") as f:
    loaded = json.load(f)
print(loaded)
```

## Вложенные данные

JSON часто бывает вложенным: список словарей, в словаре — список и т. д. Добираются до нужного значения по цепочке
ключей и индексов: `data["users"][0]["name"]`. Если ключа может не быть — `dict.get`.

## Ошибки

Некорректный JSON — исключение `json.JSONDecodeError` (это разновидность `ValueError`).
'''
PRODUCTS = '[\n  {"name": "чай", "price": 20000, "count": 3, "in_stock": true},\n  {"name": "кофе", "price": 45000, "count": 0, "in_stock": false},\n  {"name": "сахар", "price": 12000, "count": 5, "in_stock": true}\n]\n'
TRANS = '[\n  {"id": 1, "category": "еда", "amount": 35000},\n  {"id": 2, "category": "транспорт", "amount": 4000},\n  {"id": 3, "category": "еда", "amount": 12500},\n  {"id": 4, "category": "связь", "amount": 50000},\n  {"id": 5, "category": "транспорт", "amount": 2000}\n]\n'
TASKS = [
    {'id': 'json-01', 'title': 'Разбор строки', 'statement': 'Дана строка в формате JSON — объект с полями name, age и langs (список). Выведите «Имя: …», «Возраст: …» и «Языки: …» (через запятую и пробел). Если строка — не JSON, выведите «Ошибка JSON».',
     'solution': 'import json\n\ntry:\n    data = json.loads(input())\nexcept json.JSONDecodeError:\n    print("Ошибка JSON")\nelse:\n    print(f"Имя: {data[\'name\']}")\n    print(f"Возраст: {data[\'age\']}")\n    print(f"Языки: {\', \'.join(data[\'langs\'])}")',
     'inputs': [['{"name": "Азиз", "age": 19, "langs": ["python", "sql"]}'], ['{"name": "Ли", "age": 30, "langs": []}'], ["{'name': 'x'}"]], 'require': ['import:json']},
    {'id': 'json-02', 'title': 'Склад из JSON', 'statement': 'В файле products.json — список товаров с полями name, price, count, in_stock. Выведите названия товаров в наличии через запятую и пробел и во второй строке — «Стоимость запаса: <сумма price × count по товарам в наличии>».',
     'solution': 'import json\n\nwith open("products.json", encoding="utf-8") as f:\n    items = json.load(f)\nok = [p for p in items if p["in_stock"]]\nprint(", ".join(p["name"] for p in ok))\nprint(f"Стоимость запаса: {sum(p[\'price\'] * p[\'count\'] for p in ok)}")',
     'inputs': [{'files': {'products.json': PRODUCTS}}, {'files': {'products.json': '[{"name": "вода", "price": 3000, "count": 10, "in_stock": true}]\n'}}], 'require': ['import:json', 'with']},
    {'id': 'json-03', 'title': 'Сохранить профиль', 'statement': 'Дано n и n строк «ключ значение» (значение — слово или целое число). Соберите словарь (числа — как int), сохраните его в profile.json функцией json.dump, затем прочитайте файл обратно и выведите json.dumps(данные, ensure_ascii=False, sort_keys=True).',
     'solution': 'import json\n\nn = int(input())\ndata = {}\nfor _ in range(n):\n    key, value = input().split()\n    data[key] = int(value) if value.lstrip("-").isdigit() else value\nwith open("profile.json", "w", encoding="utf-8") as f:\n    json.dump(data, f, ensure_ascii=False)\nwith open("profile.json", encoding="utf-8") as f:\n    print(json.dumps(json.load(f), ensure_ascii=False, sort_keys=True))',
     'inputs': [['3', 'name Лола', 'age 19', 'city Ургенч'], ['2', 'score -5', 'b x']], 'require': ['import:json', 'with']},
    {'id': 'json-04', 'title': 'Расходы по категориям', 'statement': 'В файле transactions.json — список операций с полями id, category, amount. Выведите по каждой категории (по убыванию суммы, при равенстве — по алфавиту) «категория: сумма», затем «Итого: …».',
     'solution': 'import json\n\nwith open("transactions.json", encoding="utf-8") as f:\n    items = json.load(f)\ntotals = {}\nfor t in items:\n    totals[t["category"]] = totals.get(t["category"], 0) + t["amount"]\nfor cat, s in sorted(totals.items(), key=lambda p: (-p[1], p[0])):\n    print(f"{cat}: {s}")\nprint(f"Итого: {sum(totals.values())}")',
     'inputs': [{'files': {'transactions.json': TRANS}}, {'files': {'transactions.json': '[{"id": 1, "category": "б", "amount": 5}, {"id": 2, "category": "а", "amount": 5}]\n'}}], 'require': ['import:json']},
    {'id': 'json-05', 'title': 'Путь в настройках', 'statement': 'В файле settings.json — вложенные словари. Дано n запросов вида «a.b.c» (путь по ключам через точку). Для каждого выведите найденное значение (числа и строки как есть, словари и списки — json.dumps с ensure_ascii=False) или «Нет».',
     'solution': 'import json\n\nwith open("settings.json", encoding="utf-8") as f:\n    data = json.load(f)\nn = int(input())\nfor _ in range(n):\n    cur = data\n    found = True\n    for key in input().split("."):\n        if isinstance(cur, dict) and key in cur:\n            cur = cur[key]\n        else:\n            found = False\n            break\n    if not found:\n        print("Нет")\n    elif isinstance(cur, (dict, list)):\n        print(json.dumps(cur, ensure_ascii=False))\n    else:\n        print(cur)',
     'inputs': [{'input': ['4', 'app.name', 'app.window.width', 'db', 'app.theme.color'], 'files': {'settings.json': '{"app": {"name": "Тетрадь", "window": {"width": 800, "height": 600}}, "db": {"path": "data.db"}}\n'}},
                {'input': ['1', 'x'], 'files': {'settings.json': '{"x": [1, 2]}\n'}}], 'require': ['import:json']},
]
