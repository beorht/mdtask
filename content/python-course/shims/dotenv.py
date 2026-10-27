"""
Учебный python-dotenv курса «Начальный Python»: load_dotenv() читает файл .env (строки КЛЮЧ=значение, # — комментарий)
и кладёт значения в os.environ, не затирая уже заданные; dotenv_values() возвращает их словарём.
"""

import os


def dotenv_values(dotenv_path='.env'):
    values = {}
    try:
        with open(dotenv_path, encoding='utf-8') as f:
            lines = f.read().splitlines()
    except FileNotFoundError:
        return values
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_dotenv(dotenv_path='.env', override=False):
    values = dotenv_values(dotenv_path)
    for key, value in values.items():
        if override or key not in os.environ:
            os.environ[key] = value
    return bool(values)
