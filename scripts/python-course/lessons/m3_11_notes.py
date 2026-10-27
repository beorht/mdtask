DIR = 'm3/11-notes'
THEORY = r'''
# Мини-проект «Заметки / База клиентов»

Сделаем маленькую «базу данных» на JSON-файле: программа загружает данные при старте, выполняет команды
пользователя и сохраняет результат. Так устроены многие настоящие утилиты.

## Цикл работы программы

```text
загрузить данные из файла (если файла нет — начать с пустого списка)
повторять:
    прочитать команду
    выполнить её
пока не «выход»
сохранить данные в файл
```

## Загрузка с запасным вариантом

```python run
import json

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

print(load("нет_файла.json"))
```

## Команды

Команду разбирают на «слово команды» и «остальное»: `cmd, _, rest = line.partition(" ")`. Для каждой команды —
своя функция: `add_note(notes, text)`, `find_notes(notes, word)` и т. д. Функции получают список заметок параметром,
а не через `global`.

## Номера

Пользователю удобнее номера с 1, а в списке индексы с 0 — переводите: `notes[number - 1]`. Перед удалением
проверяйте, что номер существует, и что это вообще число.

## Сохранение

В конце — `json.dump(notes, f, ensure_ascii=False, indent=2)`. В задачах после сохранения программа выводит
содержимое файла, чтобы проверка видела, что записано.
'''
NOTES = '["купить хлеб", "сдать отчёт", "позвонить бабушке"]\n'
LOAD = 'import json\n\ndef load(path):\n    try:\n        with open(path, encoding="utf-8") as f:\n            return json.load(f)\n    except FileNotFoundError:\n        return []\n'
SAVE = '\ndef save(path, data):\n    with open(path, "w", encoding="utf-8") as f:\n        json.dump(data, f, ensure_ascii=False)\n'
TASKS = [
    {'id': 'notes-01', 'title': 'Список заметок', 'statement': 'Загрузите заметки из notes.json (список строк). Если файла нет — считайте список пустым. Выведите заметки с номерами «1. текст» или «Заметок нет».',
     'solution': LOAD + '\nnotes = load("notes.json")\nif not notes:\n    print("Заметок нет")\nfor i, text in enumerate(notes, 1):\n    print(f"{i}. {text}")', 'inputs': [{'files': {'notes.json': NOTES}}, {'files': {}}, {'files': {'notes.json': '[]\n'}}], 'require': ['def', 'try']},
    {'id': 'notes-02', 'title': 'Добавить и сохранить', 'statement': 'Загрузите notes.json (или пустой список), затем читайте строки до «выход»: каждая строка — новая заметка. Сохраните список в notes.json и выведите содержимое файла.',
     'solution': LOAD + SAVE + '\nnotes = load("notes.json")\nwhile True:\n    line = input()\n    if line == "выход":\n        break\n    notes.append(line)\nsave("notes.json", notes)\nwith open("notes.json", encoding="utf-8") as f:\n    print(f.read())',
     'inputs': [{'input': ['полить цветы', 'выход'], 'files': {'notes.json': NOTES}}, {'input': ['первая', 'вторая', 'выход'], 'files': {}}], 'require': ['def', 'while']},
    {'id': 'notes-03', 'title': 'Поиск', 'statement': 'Загрузите notes.json. Дано слово — выведите номера и тексты заметок, где оно встречается (без учёта регистра), в формате «номер. текст», или «Ничего не найдено».',
     'solution': LOAD + '\nnotes = load("notes.json")\nword = input().lower()\nfound = False\nfor i, text in enumerate(notes, 1):\n    if word in text.lower():\n        print(f"{i}. {text}")\n        found = True\nif not found:\n    print("Ничего не найдено")',
     'inputs': [{'input': ['ХЛЕБ'], 'files': {'notes.json': NOTES}}, {'input': ['за'], 'files': {'notes.json': NOTES}}, {'input': ['море'], 'files': {'notes.json': NOTES}}], 'require': ['def']},
    {'id': 'notes-04', 'title': 'Удаление по номеру', 'statement': 'Загрузите notes.json. Читайте команды до «выход»: «удалить N» — удалить заметку номер N и вывести «Удалено: текст»; если N не число — «Номер должен быть числом», если такого номера нет — «Нет заметки N». В конце сохраните файл и выведите оставшиеся заметки с номерами.',
     'solution': LOAD + SAVE + '\nnotes = load("notes.json")\nwhile True:\n    cmd, _, arg = input().partition(" ")\n    if cmd == "выход":\n        break\n    try:\n        n = int(arg)\n    except ValueError:\n        print("Номер должен быть числом")\n        continue\n    if 1 <= n <= len(notes):\n        print(f"Удалено: {notes.pop(n - 1)}")\n    else:\n        print(f"Нет заметки {n}")\nsave("notes.json", notes)\nfor i, text in enumerate(notes, 1):\n    print(f"{i}. {text}")',
     'inputs': [{'input': ['удалить 2', 'удалить 5', 'удалить два', 'удалить 1', 'выход'], 'files': {'notes.json': NOTES}}, {'input': ['выход'], 'files': {'notes.json': NOTES}}], 'require': ['def', 'try']},
    {'id': 'notes-05', 'title': 'База клиентов', 'statement': 'В clients.json — словарь «имя → {"phone": …, "debt": …}». Команды до «выход»: «добавить имя телефон» (долг 0; если клиент есть — «Уже есть»), «долг имя сумма» (прибавить сумму; нет клиента — «Нет клиента»), «должники» — имена с долгом больше 0 по убыванию долга в виде «имя: долг» (или «Должников нет»). В конце сохраните файл и выведите «Клиентов: <k>».',
     'solution': 'import json\n\ndef load(path):\n    try:\n        with open(path, encoding="utf-8") as f:\n            return json.load(f)\n    except FileNotFoundError:\n        return {}\n\nclients = load("clients.json")\nwhile True:\n    parts = input().split()\n    if parts[0] == "выход":\n        break\n    if parts[0] == "добавить":\n        if parts[1] in clients:\n            print("Уже есть")\n        else:\n            clients[parts[1]] = {"phone": parts[2], "debt": 0}\n    elif parts[0] == "долг":\n        if parts[1] in clients:\n            clients[parts[1]]["debt"] += int(parts[2])\n        else:\n            print("Нет клиента")\n    elif parts[0] == "должники":\n        debtors = sorted((c for c in clients.items() if c[1]["debt"] > 0), key=lambda c: -c[1]["debt"])\n        if not debtors:\n            print("Должников нет")\n        for name, info in debtors:\n            print(f"{name}: {info[\'debt\']}")\nwith open("clients.json", "w", encoding="utf-8") as f:\n    json.dump(clients, f, ensure_ascii=False)\nprint(f"Клиентов: {len(clients)}")',
     'inputs': [{'input': ['должники', 'добавить Бек 901', 'долг Бек 5000', 'долг Али 100', 'добавить Ли 902', 'долг Ли 9000', 'добавить Бек 1', 'должники', 'выход'], 'files': {'clients.json': '{"Аня": {"phone": "900", "debt": 0}}\n'}},
                {'input': ['выход'], 'files': {}}], 'require': ['def', 'try']},
]
