DIR = 'm5/05-requests'
THEORY = r'''
# Библиотека requests

`requests` — самая популярная библиотека для HTTP-запросов в Python. На своём компьютере её ставят командой
`pip install requests`; на сайте работает учебная версия с теми же функциями.

## Параметры запроса

Параметры удобнее передавать словарём `params` — библиотека сама соберёт строку `?city=…&…`:

```python run modules=requests
import requests

r = requests.get("http://api.edu/weather", params={"city": "Бухара"}, timeout=5)
print(r.url)
print(r.json()["humidity"])
```

`timeout` — сколько секунд ждать ответа; в настоящих программах его указывают всегда, иначе программа может зависнуть.

## Объект ответа

| Атрибут / метод | Что это |
| --- | --- |
| `r.status_code` | код ответа: 200, 404… |
| `r.ok` | `True`, если код меньше 400 |
| `r.json()` | тело как объект Python |
| `r.text` | тело как строка |
| `r.headers` | заголовки ответа (словарь) |
| `r.raise_for_status()` | выбрасывает `requests.HTTPError`, если код 4xx/5xx |

## Обработка ошибок

Сетевые запросы могут сломаться по многим причинам: нет связи, сервер не отвечает, ответ с ошибкой. Хорошая программа
готова ко всем:

```python run modules=requests
import requests

for url in ["http://api.edu/weather?city=Нукус", "http://api.edu/weather?city=Париж", "https://example.com"]:
    try:
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        print("ок:", r.json()["temp"])
    except requests.exceptions.HTTPError as e:
        print("ошибка ответа:", e.response.status_code)
    except requests.exceptions.ConnectionError:
        print("нет связи с сервером")
```

| Исключение | Когда |
| --- | --- |
| `requests.exceptions.ConnectionError` | сервер недоступен (в учебной сети — любой адрес, кроме `http://api.edu`) |
| `requests.exceptions.Timeout` | сервер не ответил вовремя |
| `requests.exceptions.HTTPError` | `raise_for_status()` при коде 4xx/5xx |
| `requests.exceptions.RequestException` | общий предок всех ошибок requests |

## Несколько запросов

Данные часто собирают из нескольких запросов: сначала список (`/cities`), потом подробности по каждому элементу.
Каждый запрос в настоящей сети занимает время — лишних запросов избегают (например, запоминая ответы).
'''
TASKS = [
    {'id': 'req-01', 'title': 'Параметры словарём', 'statement': 'Даны города по одному до «конец». Для каждого запросите /weather, передав город через params, с timeout=5, и выведите «город: влажность %» или «город: —», если ответ не ok.',
     'solution': 'import requests\n\nwhile True:\n    city = input()\n    if city == "конец":\n        break\n    r = requests.get("http://api.edu/weather", params={"city": city}, timeout=5)\n    print(f"{city}: {r.json()[\'humidity\']} %" if r.ok else f"{city}: —")', 'inputs': [['Фергана', 'Андижан', 'Лондон', 'конец'], ['конец']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'req-02', 'title': 'raise_for_status', 'statement': 'Даны номера студентов по одному до «конец». Для каждого запросите /students/<номер>, вызовите raise_for_status() и выведите имя; при requests.exceptions.HTTPError выведите «Ошибка <код>: студент <номер>».',
     'solution': 'import requests\n\nwhile True:\n    sid = input()\n    if sid == "конец":\n        break\n    try:\n        r = requests.get(f"http://api.edu/students/{sid}", timeout=5)\n        r.raise_for_status()\n        print(r.json()["name"])\n    except requests.exceptions.HTTPError as e:\n        print(f"Ошибка {e.response.status_code}: студент {sid}")', 'inputs': [['2', '7', 'abc', '1', 'конец']], 'modules': ['requests'], 'require': ['import:requests', 'try']},
    {'id': 'req-03', 'title': 'Нет связи', 'statement': 'Даны полные адреса (URL) по одному до «конец». Сделайте GET каждого и выведите «URL: код» или «URL: нет связи» (requests.exceptions.ConnectionError).',
     'solution': 'import requests\n\nwhile True:\n    url = input()\n    if url == "конец":\n        break\n    try:\n        print(f"{url}: {requests.get(url, timeout=5).status_code}")\n    except requests.exceptions.ConnectionError:\n        print(f"{url}: нет связи")', 'inputs': [['http://api.edu/cities', 'https://google.com', 'http://api.edu/нет', 'http://example.org/api', 'конец']], 'modules': ['requests'], 'require': ['import:requests', 'try']},
    {'id': 'req-04', 'title': 'Самый тёплый город', 'statement': 'Запросите /cities, затем погоду каждого города. Выведите «Самый тёплый: город (t°)» и «Самый холодный: город (t°)» (при равенстве — первый в списке). Без max, min, sorted.',
     'solution': 'import requests\n\nwarm = cold = None\nfor city in requests.get("http://api.edu/cities").json():\n    t = requests.get("http://api.edu/weather", params={"city": city}).json()["temp"]\n    if warm is None or t > warm[1]:\n        warm = (city, t)\n    if cold is None or t < cold[1]:\n        cold = (city, t)\nprint(f"Самый тёплый: {warm[0]} ({warm[1]}°)")\nprint(f"Самый холодный: {cold[0]} ({cold[1]}°)")', 'inputs': [[]], 'open': 1, 'modules': ['requests'], 'forbid': ['max', 'min', 'sorted', '.sort'], 'require': ['import:requests']},
    {'id': 'req-05', 'title': 'Сводка по условию', 'statement': 'Дано состояние погоды (например «облачно»). Выведите по алфавиту города с таким состоянием в формате «город: t°, влажность h %» и затем «Средняя температура: …» по ним (округлить до одного знака), или «Таких городов нет».',
     'solution': 'import requests\n\nwant = input()\nfound = []\nfor city in requests.get("http://api.edu/cities").json():\n    w = requests.get("http://api.edu/weather", params={"city": city}).json()\n    if w["condition"] == want:\n        found.append(w)\nif not found:\n    print("Таких городов нет")\nelse:\n    for w in found:\n        print(f"{w[\'city\']}: {w[\'temp\']}°, влажность {w[\'humidity\']} %")\n    print(f"Средняя температура: {round(sum(w[\'temp\'] for w in found) / len(found), 1)}")', 'inputs': [['облачно'], ['солнечно'], ['снег']], 'modules': ['requests'], 'require': ['import:requests']},
]
