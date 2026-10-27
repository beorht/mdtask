DIR = 'm3/09-files'
THEORY = r'''
# Файлы: open и with

Переменные живут, пока работает программа. Чтобы данные сохранились, их записывают в **файл**.

## Открыть, прочитать, закрыть

```python run
with open("hello.txt", "w", encoding="utf-8") as f:
    f.write("первая строка\n")
    f.write("вторая строка\n")

with open("hello.txt", encoding="utf-8") as f:
    text = f.read()
print(text)
```

`open(имя, режим, encoding=…)` открывает файл. Конструкция `with` сама **закрывает** файл, когда блок заканчивается,
даже если внутри случилась ошибка, — поэтому файлы открывают только через `with`. Для текста на русском всегда
указывайте `encoding="utf-8"`.

| Режим | Что делает |
| --- | --- |
| `"r"` (по умолчанию) | чтение; файла нет — `FileNotFoundError` |
| `"w"` | запись; файл создаётся заново, **старое содержимое стирается** |
| `"a"` | дописать в конец |

## Способы чтения

| Запись | Результат |
| --- | --- |
| `f.read()` | весь файл одной строкой |
| `f.readlines()` | список строк (с `\n` на конце) |
| `for line in f:` | строки по одной — экономит память на больших файлах |
| `f.read().splitlines()` | список строк без `\n` |

```python run
with open("nums.txt", "w", encoding="utf-8") as f:
    f.write("10\n20\n\n30\n")
total = 0
with open("nums.txt", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            total += int(line)
print(total)
```

`strip()` убирает `\n` и пробелы по краям; пустые строки пропускаем.

## Запись

`f.write(текст)` не добавляет перевод строки — пишите `\n` сами. Можно и так: `print(текст, file=f)`.

## Нет файла

```python run
try:
    with open("нет_такого.txt", encoding="utf-8") as f:
        print(f.read())
except FileNotFoundError:
    print("файл не найден")
```

## Файлы в задачах

В задачах этого урока нужные файлы уже лежат рядом с программой — их содержимое видно в примерах условия. Программа
открывает их по имени.
'''
POEM = 'Мороз и солнце; день чудесный!\nЕщё ты дремлешь, друг прелестный —\nПора, красавица, проснись:\nОткрой сомкнуты негой взоры\n'
LOG = 'INFO сервер запущен\nWARN мало места на диске\nERROR не удалось открыть базу\nINFO вход пользователя\nERROR таймаут запроса\n'
TASKS = [
    {'id': 'file-01', 'title': 'Статистика текста', 'statement': 'В файле text.txt — текст. Выведите три строки: «Строк: …», «Слов: …», «Символов: …» (символы считайте вместе с пробелами, без символов перевода строки).',
     'solution': 'with open("text.txt", encoding="utf-8") as f:\n    lines = f.read().splitlines()\nprint(f"Строк: {len(lines)}")\nprint(f"Слов: {sum(len(l.split()) for l in lines)}")\nprint(f"Символов: {sum(len(l) for l in lines)}")',
     'inputs': [{'files': {'text.txt': POEM}}, {'files': {'text.txt': 'одна строка\n'}}, {'files': {'text.txt': 'a b\n\nc\n'}}], 'require': ['with']},
    {'id': 'file-02', 'title': 'Сумма из файла', 'statement': 'В файле numbers.txt — целые числа по одному в строке; пустые строки пропускайте. Выведите сумму и количество чисел через пробел.',
     'solution': 'total = 0\ncount = 0\nwith open("numbers.txt", encoding="utf-8") as f:\n    for line in f:\n        line = line.strip()\n        if line:\n            total += int(line)\n            count += 1\nprint(total, count)',
     'inputs': [{'files': {'numbers.txt': '10\n20\n\n30\n'}}, {'files': {'numbers.txt': '-5\n'}}, {'files': {'numbers.txt': '\n\n'}}], 'require': ['with']},
    {'id': 'file-03', 'title': 'Записать и прочитать', 'statement': 'Дано n и n строк. Запишите их в файл out.txt (каждую с новой строки), затем откройте файл заново, прочитайте и выведите строки с номерами: «1: текст».',
     'solution': 'n = int(input())\nwith open("out.txt", "w", encoding="utf-8") as f:\n    for _ in range(n):\n        f.write(input() + "\\n")\nwith open("out.txt", encoding="utf-8") as f:\n    for i, line in enumerate(f, 1):\n        print(f"{i}: {line.rstrip()}")',
     'inputs': [['3', 'купить хлеб', 'сделать урок', 'позвонить маме'], ['1', 'одна']], 'require': ['with']},
    {'id': 'file-04', 'title': 'Самая длинная строка', 'statement': 'В файле poem.txt — стихотворение. Выведите самую длинную строку (при равенстве — первую) и её длину через « — ».',
     'solution': 'best = ""\nwith open("poem.txt", encoding="utf-8") as f:\n    for line in f:\n        line = line.rstrip("\\n")\n        if len(line) > len(best):\n            best = line\nprint(f"{best} — {len(best)}")',
     'inputs': [{'files': {'poem.txt': POEM}}, {'files': {'poem.txt': 'ab\ncd\n'}}], 'require': ['with'], 'forbid': ['max', 'sorted']},
    {'id': 'file-05', 'title': 'Разбор журнала', 'statement': 'В файле log.txt — строки «УРОВЕНЬ сообщение». Выведите количество строк каждого уровня в порядке первого появления («INFO: 2») и затем все сообщения уровня ERROR с префиксом «! ».',
     'solution': 'counts = {}\nerrors = []\nwith open("log.txt", encoding="utf-8") as f:\n    for line in f:\n        level, _, message = line.strip().partition(" ")\n        if not level:\n            continue\n        counts[level] = counts.get(level, 0) + 1\n        if level == "ERROR":\n            errors.append(message)\nfor level, k in counts.items():\n    print(f"{level}: {k}")\nfor m in errors:\n    print(f"! {m}")',
     'inputs': [{'files': {'log.txt': LOG}}, {'files': {'log.txt': 'INFO ок\n'}}], 'require': ['with']},
    {'id': 'file-06', 'title': 'Ведомость', 'statement': 'В файле grades.csv — строки «имя;оценка» (первая строка — заголовок «name;mark»). Выведите по алфавиту «имя: средняя оценка» (округлить до двух знаков) и запишите то же самое в файл report.txt; в конце выведите «Записано строк: <k>».',
     'solution': 'sums = {}\ncnt = {}\nwith open("grades.csv", encoding="utf-8") as f:\n    next(f)\n    for line in f:\n        line = line.strip()\n        if not line:\n            continue\n        name, mark = line.split(";")\n        sums[name] = sums.get(name, 0) + int(mark)\n        cnt[name] = cnt.get(name, 0) + 1\nlines = [f"{n}: {round(sums[n] / cnt[n], 2)}" for n in sorted(sums)]\nwith open("report.txt", "w", encoding="utf-8") as f:\n    f.write("\\n".join(lines) + "\\n")\nfor l in lines:\n    print(l)\nprint(f"Записано строк: {len(lines)}")',
     'inputs': [{'files': {'grades.csv': 'name;mark\nВали;4\nАли;5\nВали;5\nАли;3\nГани;5\n'}}, {'files': {'grades.csv': 'name;mark\nЯ;5\n'}}], 'require': ['with']},
]
