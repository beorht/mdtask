DIR = 'm5/06-api-keys'
THEORY = r'''
# API-ключи и авторизация

Многие API не отвечают кому попало: сервис хочет знать, **кто** делает запрос, — чтобы ограничить число запросов,
брать плату или защитить личные данные. Самый простой способ — **API-ключ**: секретная строка, которую выдаёт сервис
при регистрации.

## Заголовки

Кроме адреса и тела, у HTTP-запроса есть **заголовки** — служебные пары «имя: значение». Ключ обычно передают
заголовком:

```python run modules=requests
import requests

resp = requests.get("http://api.edu/rates", params={"base": "EUR"})
print(resp.status_code, resp.json())

resp = requests.get("http://api.edu/rates", params={"base": "EUR"}, headers={"X-API-Key": "demo-key-123"})
print(resp.status_code, resp.json()["rates"]["UZS"])
```

В учебном API курсы валют (`/rates`) отдаются только с заголовком `X-API-Key`. Учебные ключи: `demo-key-123` и
`edu-key-2026`. Без ключа или с неверным — ответ **401 Unauthorized**.

## Варианты авторизации

| Способ | Как выглядит |
| --- | --- |
| ключ в заголовке | `X-API-Key: abc123` |
| токен Bearer | `Authorization: Bearer eyJhbGciOi…` |
| ключ в параметре | `?api_key=abc123` (хуже: адрес попадает в журналы) |
| логин и пароль | `requests.get(url, auth=("user", "pass"))` |

## Ключ — это секрет

Ключ даёт доступ от вашего имени, как пароль. Поэтому:

- не пишите ключ прямо в коде, который попадёт к другим людям или в Git;
- не отправляйте его в чатах и на скриншотах;
- если ключ утёк — отзовите его в кабинете сервиса и получите новый.

Как хранить ключи отдельно от кода — в следующем уроке (файл `.env`).

## Курсы валют

Ответ `/rates?base=USD`: `{"base": "USD", "rates": {"UZS": 12750.0, "EUR": 0.92, …}}` — сколько единиц другой валюты
дают за одну единицу базовой. Перевести `x` долларов в сумы: `x * rates["UZS"]`.
'''
TASKS = [
    {'id': 'key-01', 'title': 'Без ключа и с ключом', 'statement': 'Дан ключ. Сначала запросите /rates?base=USD без ключа и выведите «Без ключа: <код> <текст поля error>». Затем с заголовком X-API-Key = введённый ключ: если код 200 — «С ключом: 1 USD = <UZS> UZS», иначе «С ключом: <код>».',
     'solution': 'import requests\n\nkey = input()\nr = requests.get("http://api.edu/rates", params={"base": "USD"})\nprint(f"Без ключа: {r.status_code} {r.json()[\'error\']}")\nr = requests.get("http://api.edu/rates", params={"base": "USD"}, headers={"X-API-Key": key})\nif r.status_code == 200:\n    print(f"С ключом: 1 USD = {r.json()[\'rates\'][\'UZS\']} UZS")\nelse:\n    print(f"С ключом: {r.status_code}")', 'inputs': [['edu-key-2026'], ['чужой-ключ'], ['demo-key-123']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'key-02', 'title': 'Конвертер', 'statement': 'Первая строка — ключ. Дальше запросы «сумма ИЗ В» до «конец» (например «100 USD UZS»). Получите курсы для валюты ИЗ и выведите «сумма ИЗ = результат В» (результат округлить до двух знаков); если валюты ИЗ нет (404) или В нет в курсах — «Нет курса ИЗ -> В».',
     'solution': 'import requests\n\nkey = input()\nwhile True:\n    line = input()\n    if line == "конец":\n        break\n    amount, src, dst = line.split()\n    r = requests.get("http://api.edu/rates", params={"base": src}, headers={"X-API-Key": key})\n    rates = r.json().get("rates", {}) if r.ok else {}\n    if dst in rates:\n        print(f"{amount} {src} = {round(float(amount) * rates[dst], 2)} {dst}")\n    else:\n        print(f"Нет курса {src} -> {dst}")', 'inputs': [['demo-key-123', '100 USD UZS', '50 EUR RUB', '10 GBP USD', '7 USD JPY', 'конец']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'key-03', 'title': 'Проверка ключей', 'statement': 'Даны ключи по одному до «конец». Для каждого сделайте запрос к /rates и выведите «ключ: принят» (200) или «ключ: отклонён» (401). Ключ выводите замаскированным: первые 3 символа и «***».',
     'solution': 'import requests\n\nwhile True:\n    key = input()\n    if key == "конец":\n        break\n    r = requests.get("http://api.edu/rates", headers={"X-API-Key": key})\n    print(f"{key[:3]}***: {\'принят\' if r.status_code == 200 else \'отклонён\'}")', 'inputs': [['edu-key-2026', 'abc', 'demo-key-123', 'EDU-KEY-2026', 'конец']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'key-04', 'title': 'Таблица курсов', 'statement': 'Даны ключ и базовая валюта. Выведите таблицу курсов по алфавиту кодов: «1 БАЗА = курс КОД» (курс — с двумя знаками после точки, через f"{x:.2f}"), или «Ошибка: <код ответа>».',
     'solution': 'import requests\n\nkey = input()\nbase = input()\nr = requests.get("http://api.edu/rates", params={"base": base}, headers={"X-API-Key": key})\nif not r.ok:\n    print(f"Ошибка: {r.status_code}")\nelse:\n    rates = r.json()["rates"]\n    for code in sorted(rates):\n        print(f"1 {base} = {rates[code]:.2f} {code}")', 'inputs': [['edu-key-2026', 'EUR'], ['edu-key-2026', 'XYZ'], ['plohoy', 'USD']], 'modules': ['requests'], 'require': ['import:requests']},
    {'id': 'key-05', 'title': 'Что выгоднее', 'statement': 'Даны ключ и две суммы: «сумма USD» и «сумма EUR». Переведите обе в сумы по курсам (/rates с base USD и base EUR) и выведите обе суммы в сумах (округлить до целого через round) и какая больше: «Больше USD», «Больше EUR» или «Поровну».',
     'solution': 'import requests\n\nkey = input()\nh = {"X-API-Key": key}\nusd = float(input().split()[0])\neur = float(input().split()[0])\nu = round(usd * requests.get("http://api.edu/rates", params={"base": "USD"}, headers=h).json()["rates"]["UZS"])\ne = round(eur * requests.get("http://api.edu/rates", params={"base": "EUR"}, headers=h).json()["rates"]["UZS"])\nprint(f"USD: {u} UZS")\nprint(f"EUR: {e} UZS")\nprint("Больше USD" if u > e else "Больше EUR" if e > u else "Поровну")', 'inputs': [['demo-key-123', '100 USD', '90 EUR'], ['demo-key-123', '108.7 USD', '100 EUR'], ['edu-key-2026', '1 USD', '1 EUR']], 'modules': ['requests'], 'require': ['import:requests']},
]
