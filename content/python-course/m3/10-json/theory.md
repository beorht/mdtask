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
