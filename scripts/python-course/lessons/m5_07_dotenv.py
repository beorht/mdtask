DIR = 'm5/07-dotenv'
THEORY = r'''
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
'''
ENV1 = 'API_KEY=edu-key-2026\nDEFAULT_CITY=Хива\nDEBUG=false\n'
ENV2 = '# пустой ключ\nDEFAULT_CITY=Нукус\nTIMEOUT=3\n'
TASKS = [
    {'id': 'env-01', 'title': 'Прочитать настройки', 'statement': 'Загрузите .env (load_dotenv) и выведите три строки: «Город: <DEFAULT_CITY или «не задан»>», «Отладка: да/нет» (DEBUG == "true") и «Ключ: <первые 3 символа API_KEY>***» или «Ключ: нет».',
     'solution': 'import os\nfrom dotenv import load_dotenv\n\nload_dotenv()\nprint(f"Город: {os.getenv(\'DEFAULT_CITY\', \'не задан\')}")\nprint(f"Отладка: {\'да\' if os.getenv(\'DEBUG\') == \'true\' else \'нет\'}")\nkey = os.getenv("API_KEY")\nprint(f"Ключ: {key[:3]}***" if key else "Ключ: нет")', 'inputs': [{'files': {'.env': ENV1}}, {'files': {'.env': ENV2}}, {'files': {'.env': 'DEBUG=true\n'}}], 'modules': ['dotenv'], 'require': ['import:dotenv']},
    {'id': 'env-02', 'title': 'Ключ из .env', 'statement': 'Загрузите .env. Если API_KEY не задан — выведите «Нет ключа в .env». Иначе запросите /rates?base=USD с этим ключом: при 200 выведите «1 USD = <UZS> UZS», иначе «Ключ не подошёл».',
     'solution': 'import os\nimport requests\nfrom dotenv import load_dotenv\n\nload_dotenv()\nkey = os.getenv("API_KEY")\nif not key:\n    print("Нет ключа в .env")\nelse:\n    r = requests.get("http://api.edu/rates", params={"base": "USD"}, headers={"X-API-Key": key})\n    print(f"1 USD = {r.json()[\'rates\'][\'UZS\']} UZS" if r.status_code == 200 else "Ключ не подошёл")', 'inputs': [{'files': {'.env': ENV1}}, {'files': {'.env': ENV2}}, {'files': {'.env': 'API_KEY=wrong\n'}}], 'modules': ['dotenv', 'requests'], 'require': ['import:dotenv', 'import:requests']},
    {'id': 'env-03', 'title': 'Город по умолчанию', 'statement': 'Загрузите .env. Даны города по одному до «конец»; пустая строка означает «город по умолчанию» (DEFAULT_CITY, а если его нет — Ташкент). Для каждого выведите «город: t°» по /weather или «город: нет данных».',
     'solution': 'import os\nimport requests\nfrom dotenv import load_dotenv\n\nload_dotenv()\ndefault = os.getenv("DEFAULT_CITY", "Ташкент")\nwhile True:\n    city = input()\n    if city == "конец":\n        break\n    city = city or default\n    r = requests.get("http://api.edu/weather", params={"city": city})\n    print(f"{city}: {r.json()[\'temp\']}°" if r.ok else f"{city}: нет данных")', 'inputs': [{'input': ['', 'Бухара', 'конец'], 'files': {'.env': ENV2}}, {'input': ['', 'Хива', 'конец'], 'files': {'.env': 'DEBUG=false\n'}}], 'modules': ['dotenv', 'requests'], 'require': ['import:dotenv']},
    {'id': 'env-04', 'title': 'Защищены ли секреты', 'statement': 'Рядом лежат .gitignore и .env.example. Выведите «.env в .gitignore: да/нет» (строка «.env» среди строк .gitignore без пробелов по краям) и затем имена настроек из .env.example, у которых в нём заполнено значение (их нужно убрать), — «Убрать значение: ИМЯ», или «Пример без секретов».',
     'solution': 'with open(".gitignore", encoding="utf-8") as f:\n    ignored = [line.strip() for line in f]\nprint(f".env в .gitignore: {\'да\' if \'.env\' in ignored else \'нет\'}")\nbad = []\nwith open(".env.example", encoding="utf-8") as f:\n    for line in f:\n        line = line.strip()\n        if line and not line.startswith("#") and "=" in line:\n            name, _, value = line.partition("=")\n            if value.strip():\n                bad.append(name.strip())\nfor name in bad:\n    print(f"Убрать значение: {name}")\nif not bad:\n    print("Пример без секретов")', 'inputs': [{'files': {'.gitignore': '__pycache__/\n.env\n', '.env.example': 'API_KEY=\nDEFAULT_CITY=\n'}}, {'files': {'.gitignore': '*.pyc\n', '.env.example': 'API_KEY=edu-key-2026\n# комментарий\nCITY=Хива\nTIMEOUT=\n'}}], 'require': ['with']},
    {'id': 'env-05', 'title': 'Проверка конфигурации', 'statement': 'Дана строка с именами обязательных настроек через пробел. Прочитайте .env через dotenv_values (без записи в окружение). Выведите «Не заданы: имена через запятую и пробел» (в порядке строки; пустое значение тоже считается незаданным) или «Конфигурация в порядке», а затем «Настроек в .env: k».',
     'solution': 'from dotenv import dotenv_values\n\nneed = input().split()\nvalues = dotenv_values(".env")\nmissing = [n for n in need if not values.get(n)]\nprint(f"Не заданы: {\', \'.join(missing)}" if missing else "Конфигурация в порядке")\nprint(f"Настроек в .env: {len(values)}")', 'inputs': [{'input': ['API_KEY DEFAULT_CITY DB_PATH'], 'files': {'.env': ENV1}}, {'input': ['DEFAULT_CITY'], 'files': {'.env': ENV2}}, {'input': ['API_KEY'], 'files': {'.env': 'API_KEY=\n'}}], 'modules': ['dotenv'], 'require': ['import:dotenv']},
]
