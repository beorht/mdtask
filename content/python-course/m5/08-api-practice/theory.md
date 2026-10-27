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
