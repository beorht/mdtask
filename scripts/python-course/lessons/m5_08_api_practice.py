DIR = 'm5/08-api-practice'
THEORY = r'''
# Практика: подключение к API

Итог модуля — небольшие программы-клиенты, которые объединяют всё: запросы, ключи из `.env`, обработку ошибок, JSON и
вывод отчётов.

## Каркас клиента

```python run modules=requests,dotenv
import os
import requests
from dotenv import load_dotenv

load_dotenv()
BASE = "http://api.edu"
HEADERS = {"X-API-Key": os.getenv("API_KEY", "")}

def get(path, **params):
    r = requests.get(BASE + path, params=params, headers=HEADERS, timeout=5)
    r.raise_for_status()
    return r.json()

print(get("/cities")[:2])
```

Одна функция `get` для всех запросов: адрес, заголовки и проверка ответа — в одном месте. Если API поменяет адрес
или способ авторизации, править придётся одну строку.

## Кэширование

Повторный запрос за теми же данными — лишнее время и лишняя нагрузка на сервер. Ответы запоминают в словаре:

```python run modules=requests
import requests

cache = {}
requests_made = 0

def weather(city):
    global requests_made
    if city not in cache:
        requests_made += 1
        cache[city] = requests.get("http://api.edu/weather", params={"city": city}).json()
    return cache[city]

for c in ["Хива", "Нукус", "Хива"]:
    weather(c)
print("запросов:", requests_made)
```

## Перебор, пока есть данные

Если неизвестно, сколько записей в API, их запрашивают по очереди (`/students/1`, `/students/2`, …), пока не придёт
404. В настоящих API для этого есть «страницы» (`?page=2`) — идея та же.

## Отчёт

Собранные данные удобно сложить в словарь или список словарей, а затем уже считать и выводить — так код запросов
отделён от кода отчёта.
'''
ENV = 'API_KEY=edu-key-2026\nDEFAULT_CITY=Хива\n'
TASKS = [
    {'id': 'apip-01', 'title': 'Сводка погоды', 'statement': 'Даны города через запятую и пробел. Выведите таблицу «город | t° | состояние» для найденных городов в порядке ввода, затем «Не найдены: …» (если такие были) и «Средняя температура: …» по найденным (один знак).',
     'solution': 'import requests\n\nfound = []\nmissing = []\nfor city in input().split(", "):\n    r = requests.get("http://api.edu/weather", params={"city": city}, timeout=5)\n    if r.ok:\n        found.append(r.json())\n    else:\n        missing.append(city)\nfor w in found:\n    print(f"{w[\'city\']} | {w[\'temp\']}° | {w[\'condition\']}")\nif missing:\n    print(f"Не найдены: {\', \'.join(missing)}")\nprint(f"Средняя температура: {round(sum(w[\'temp\'] for w in found) / len(found), 1)}")', 'inputs': [['Хива, Нукус, Рим, Андижан'], ['Ташкент']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'apip-02', 'title': 'Обменник', 'statement': 'Ключ — в .env (API_KEY). Команды до «конец»: «сумма ИЗ В». Курсы для каждой валюты ИЗ запрашивайте один раз (кэш в словаре). Выводите «сумма ИЗ = результат В» (два знака) или «Нет курса ИЗ -> В», в конце — «Запросов к API: k».',
     'solution': 'import os\nimport requests\nfrom dotenv import load_dotenv\n\nload_dotenv()\nheaders = {"X-API-Key": os.getenv("API_KEY", "")}\ncache = {}\nwhile True:\n    line = input()\n    if line == "конец":\n        break\n    amount, src, dst = line.split()\n    if src not in cache:\n        r = requests.get("http://api.edu/rates", params={"base": src}, headers=headers)\n        cache[src] = r.json()["rates"] if r.ok else {}\n    rates = cache[src]\n    if dst in rates:\n        print(f"{amount} {src} = {round(float(amount) * rates[dst], 2)} {dst}")\n    else:\n        print(f"Нет курса {src} -> {dst}")\nprint(f"Запросов к API: {len(cache)}")', 'inputs': [{'input': ['100 USD UZS', '10 USD EUR', '5 EUR RUB', '1 USD XXX', '3 YEN USD', 'конец'], 'files': {'.env': ENV}}], 'modules': ['requests', 'dotenv'], 'require': ['import:requests', 'import:dotenv']},
    {'id': 'apip-03', 'title': 'Все студенты', 'statement': 'Запрашивайте /students/1, /students/2, … пока не придёт 404. Для каждой группы (по алфавиту) выведите «группа: имена через запятую и пробел; средний балл X» (средний по всем оценкам группы, два знака), в конце — «Всего студентов: k».',
     'solution': 'import requests\n\ngroups = {}\nsid = 1\nwhile True:\n    r = requests.get(f"http://api.edu/students/{sid}")\n    if r.status_code == 404:\n        break\n    s = r.json()\n    groups.setdefault(s["group"], []).append(s)\n    sid += 1\nfor g in sorted(groups):\n    names = ", ".join(s["name"] for s in groups[g])\n    grades = [x for s in groups[g] for x in s["grades"]]\n    print(f"{g}: {names}; средний балл {round(sum(grades) / len(grades), 2)}")\nprint(f"Всего студентов: {sid - 1}")', 'inputs': [[]], 'open': 1, 'modules': ['requests'], 'require': ['import:requests', 'while']},
    {'id': 'apip-04', 'title': 'Заметки с проверкой', 'statement': 'Команды до «конец»: «add текст» — POST /notes (при 201 вывести «Заметка #id», при 400 — «Пустая заметка не сохранена»), «list» — GET /notes, вывести «#id текст» по каждой или «Заметок нет», «count» — число заметок с сервера.',
     'solution': 'import requests\n\nURL = "http://api.edu/notes"\nwhile True:\n    cmd, _, text = input().partition(" ")\n    if cmd == "конец":\n        break\n    if cmd == "add":\n        r = requests.post(URL, json={"text": text})\n        print(f"Заметка #{r.json()[\'id\']}" if r.status_code == 201 else "Пустая заметка не сохранена")\n    elif cmd == "list":\n        notes = requests.get(URL).json()\n        if not notes:\n            print("Заметок нет")\n        for n in notes:\n            print(f"#{n[\'id\']} {n[\'text\']}")\n    elif cmd == "count":\n        print(len(requests.get(URL).json()))', 'inputs': [['list', 'add полить цветы', 'add', 'add сдать отчёт', 'list', 'count', 'конец']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'apip-05', 'title': 'Погода с кэшем и отчётом', 'statement': 'Ключ и город по умолчанию — в .env. Даны запросы городов до «конец» (пустая строка — город по умолчанию). Выведите по каждому «город: t°» или «город: нет данных», погоду каждого города запрашивайте не больше одного раза. В конце — «Запросов: k, из кэша: m» и «Теплее всего: город (t°)» среди найденных (без max).',
     'solution': 'import os\nimport requests\nfrom dotenv import load_dotenv\n\nload_dotenv()\ndefault = os.getenv("DEFAULT_CITY", "Ташкент")\ncache = {}\nhits = 0\nwhile True:\n    city = input()\n    if city == "конец":\n        break\n    city = city or default\n    if city in cache:\n        hits += 1\n    else:\n        r = requests.get("http://api.edu/weather", params={"city": city})\n        cache[city] = r.json() if r.ok else None\n    w = cache[city]\n    print(f"{city}: {w[\'temp\']}°" if w else f"{city}: нет данных")\nprint(f"Запросов: {len(cache)}, из кэша: {hits}")\nbest = None\nfor w in cache.values():\n    if w and (best is None or w["temp"] > best["temp"]):\n        best = w\nif best:\n    print(f"Теплее всего: {best[\'city\']} ({best[\'temp\']}°)")', 'inputs': [{'input': ['', 'Бухара', 'Хива', 'Париж', 'Бухара', '', 'конец'], 'files': {'.env': ENV}}], 'modules': ['requests', 'dotenv'], 'require': ['import:requests'], 'forbid': ['max', 'sorted']},
]
