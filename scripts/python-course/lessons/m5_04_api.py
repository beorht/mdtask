DIR = 'm5/04-api'
THEORY = r'''
# Что такое API и REST

**API** (Application Programming Interface) — способ, которым одна программа пользуется другой. Веб-API — это сервер,
который отвечает не страницами для людей, а **данными для программ**, обычно в JSON. Прогноз погоды в телефоне,
курс валют в банковском приложении, карта в такси — всё это запросы к API.

## Запрос и ответ

Программа-**клиент** отправляет **HTTP-запрос** на адрес, сервер возвращает **ответ**:

```text
GET http://api.edu/weather?city=Хива
→ 200 OK
→ {"city": "Хива", "temp": 19, "condition": "солнечно"}
```

- **адрес (URL)**: `http://api.edu` — сервер, `/weather` — **эндпоинт** (конкретный «вход» API), после `?` —
  **параметры** `ключ=значение` через `&`;
- **метод**: `GET` — получить данные, `POST` — отправить новые (создать), реже `PUT`/`PATCH` — изменить,
  `DELETE` — удалить;
- **код ответа** — число, по которому видно, получилось ли;
- **тело ответа** — сами данные, как правило JSON.

## Коды ответа

| Код | Значит |
| --- | --- |
| 200 OK | всё хорошо, данные в ответе |
| 201 Created | создано (ответ на POST) |
| 400 Bad Request | запрос неправильный (нет нужного параметра) |
| 401 Unauthorized | нужна авторизация (ключ) |
| 403 Forbidden | доступ запрещён |
| 404 Not Found | такого нет |
| 500 Internal Server Error | ошибка на сервере |

Коды 2xx — успех, 4xx — ошибка клиента, 5xx — ошибка сервера.

## REST

**REST** — распространённый стиль API: каждая сущность имеет свой адрес (`/students/3` — студент № 3), а действие
задаётся методом (`GET /students/3` — получить, `DELETE /students/3` — удалить).

## Учебный API сайта

В классе нет интернета, поэтому на сайте работает **учебный API** `http://api.edu` и учебная библиотека `requests` —
с теми же функциями, что у настоящей (`pip install requests`). Программы, написанные здесь, будут работать и с
настоящими API — поменяется только адрес.

| Запрос | Ответ |
| --- | --- |
| `GET /cities` | список городов |
| `GET /weather?city=…` | погода (400 — нет параметра, 404 — нет города) |
| `GET /rates?base=USD` | курсы валют — нужен ключ (урок 5.6) |
| `GET /students/<номер>` | студент: name, group, grades |
| `POST /notes` с JSON `{"text": …}` | создать заметку (201) |
| `GET /notes` | заметки этого запуска |

```python run modules=requests
import requests

response = requests.get("http://api.edu/cities")
print(response.status_code)
print(response.json())
```

`response.status_code` — код ответа, `response.json()` — тело, разобранное из JSON в списки и словари Python.
'''
TASKS = [
    {'id': 'api-01', 'title': 'Список городов', 'statement': 'Запросите GET http://api.edu/cities. Выведите код ответа, затем «Городов: k» и сами города через запятую и пробел.',
     'solution': 'import requests\n\nr = requests.get("http://api.edu/cities")\nprint(r.status_code)\ncities = r.json()\nprint(f"Городов: {len(cities)}")\nprint(", ".join(cities))', 'inputs': [[]], 'open': 1, 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'api-02', 'title': 'Погода', 'statement': 'Даны названия городов по одному в строке до строки «конец». Для каждого запросите /weather?city=… и выведите «город: температура°, состояние» или «город: нет данных», если код ответа 404.',
     'solution': 'import requests\n\nwhile True:\n    city = input()\n    if city == "конец":\n        break\n    r = requests.get("http://api.edu/weather?city=" + city)\n    if r.status_code == 404:\n        print(f"{city}: нет данных")\n    else:\n        w = r.json()\n        print(f"{city}: {w[\'temp\']}°, {w[\'condition\']}")', 'inputs': [['Ташкент', 'Нукус', 'Москва', 'конец'], ['Бухара', 'конец']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'api-03', 'title': 'Коды ответа', 'statement': 'Даны адреса эндпоинтов учебного API (например /weather?city=Хива) по одному до «конец». Сделайте GET на http://api.edu + адрес и выведите «адрес -> код».',
     'solution': 'import requests\n\nwhile True:\n    path = input()\n    if path == "конец":\n        break\n    print(f"{path} -> {requests.get(\'http://api.edu\' + path).status_code}")', 'inputs': [['/cities', '/weather', '/weather?city=Бухара', '/students/9', '/rates', '/секрет', 'конец']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'api-04', 'title': 'Студенты', 'statement': 'Даны номера студентов через пробел. Для каждого запросите /students/<номер> и выведите «номер. имя (группа): средний балл» (округлить до двух знаков) или «номер: не найден».',
     'solution': 'import requests\n\nfor sid in input().split():\n    r = requests.get(f"http://api.edu/students/{sid}")\n    if r.status_code == 200:\n        s = r.json()\n        print(f"{sid}. {s[\'name\']} ({s[\'group\']}): {round(sum(s[\'grades\']) / len(s[\'grades\']), 2)}")\n    else:\n        print(f"{sid}: не найден")', 'inputs': [['1 2 5'], ['4 3'], ['0']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'api-05', 'title': 'Заметки через POST', 'statement': 'Даны тексты заметок по одному до «конец». Отправьте каждый POST-запросом на /notes с json={"text": текст}; выводите «код: id» при успехе или «код: ошибка» (пустой текст — 400). В конце запросите GET /notes и выведите «Сохранено: k».',
     'solution': 'import requests\n\nwhile True:\n    text = input()\n    if text == "конец":\n        break\n    r = requests.post("http://api.edu/notes", json={"text": text})\n    if r.status_code == 201:\n        print(f"{r.status_code}: {r.json()[\'id\']}")\n    else:\n        print(f"{r.status_code}: ошибка")\nprint(f"Сохранено: {len(requests.get(\'http://api.edu/notes\').json())}")', 'inputs': [['купить хлеб', '', 'позвонить', 'конец'], ['конец']], 'modules': ['requests'], 'require': ['import:requests']},
]
