# Файл .env и python-dotenv

Ключ API нельзя хранить в коде: код показывают товарищам, выкладывают на GitHub, а ключ — это пароль. Принято
хранить секреты и настройки в отдельном файле **`.env`** рядом с программой:

```text
# .env — настройки и секреты, в Git не попадает
API_KEY=edu-key-2026
DEFAULT_CITY=Хива
DEBUG=false
```

Каждая строка — `ИМЯ=значение`, строки с `#` — комментарии.

## Переменные окружения

Программа читает настройки из **переменных окружения** — словаря `os.environ`. Библиотека `python-dotenv`
(`pip install python-dotenv`, импортируется как `dotenv`) загружает в них значения из `.env`:

```python run modules=dotenv
import os
from dotenv import load_dotenv

with open(".env", "w", encoding="utf-8") as f:
    f.write("API_KEY=demo-key-123\nDEFAULT_CITY=Хива\n")

load_dotenv()
print(os.getenv("API_KEY"))
print(os.getenv("TIMEOUT", "10"))
```

- `load_dotenv()` читает `.env` и кладёт значения в `os.environ` (уже заданные переменные не затирает);
- `os.getenv("ИМЯ")` — значение или `None`; `os.getenv("ИМЯ", "по умолчанию")` — со значением по умолчанию;
- `dotenv_values(".env")` — словарь значений без записи в окружение.

Все значения — **строки**: `"10"` → `int(...)`, `"false"` → сравнивайте `== "true"`.

## .gitignore

Чтобы `.env` не попал в репозиторий, его имя пишут в файл `.gitignore`:

```text
.env
__pycache__/
```

А в репозиторий кладут `.env.example` — тот же список имён, но без настоящих значений, чтобы другой разработчик знал,
какие настройки заполнить.

## Проверка настроек при старте

Если обязательной настройки нет, лучше сразу понятно сообщить об этом, чем упасть позже с непонятной ошибкой:

```python run modules=dotenv
import os
from dotenv import load_dotenv

load_dotenv()
missing = [name for name in ["API_KEY", "DB_PATH"] if not os.getenv(name)]
if missing:
    print("Не заданы:", ", ".join(missing))
```

В задачах файл `.env` уже лежит рядом с программой — его содержимое видно в примерах.
