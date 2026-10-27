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
