DIR = 'm3/13-hangman'
THEORY = r'''
# Мини-проект «Виселица»

Игра: компьютер загадал слово, игрок угадывает буквы по одной. Угаданные буквы открываются на своих местах, за каждую
ошибку рисуется часть «виселицы»; после 6 ошибок — проигрыш.

## Состояние игры

| Что хранить | Как |
| --- | --- |
| загаданное слово | строка |
| угаданные буквы | множество `set()` — проверка «уже было» мгновенная |
| число ошибок | целое |

## Маска слова

Показываем слово, где неотгаданные буквы заменены на `_`:

```python run
word = "питон"
opened = {"и", "н"}
mask = " ".join(ch if ch in opened else "_" for ch in word)
print(mask)
```

Слово отгадано, когда в маске не осталось `_` — или когда **каждая** буква слова есть в множестве угаданных:
`all(ch in opened for ch in word)`.

## Главный цикл

```text
пока ошибок < 6 и слово не отгадано:
    прочитать букву
    если не одна буква — сообщить и пропустить ход (continue)
    если уже была — сообщить «Уже было», пропустить
    добавить в угаданные
    если её нет в слове — ошибок += 1
    показать маску
```

В задачах загаданное слово приходит первой строкой ввода — как будто его загадал второй игрок. Чтобы сыграть с
компьютером, замените её на `random.choice(список_слов)`.

## Регистр

Игрок может ввести «А» вместо «а» — приводите букву к нижнему регистру.
'''
MASK = 'def mask(word, opened):\n    return " ".join(ch if ch in opened else "_" for ch in word)\n'
TASKS = [
    {'id': 'hang-01', 'title': 'Маска', 'statement': 'Напишите функцию mask(word, opened), возвращающую слово, где буквы не из множества opened заменены на «_», через пробел. Даны слово и строка открытых букв — выведите маску.',
     'solution': MASK + '\nword = input()\nprint(mask(word, set(input())))', 'inputs': [['питон', 'ин'], ['программа', 'ам'], ['кот', ''], ['да', 'ад']], 'require': ['def:mask']},
    {'id': 'hang-02', 'title': 'Игра до победы', 'statement': 'Первая строка — слово, дальше — буквы игрока. После каждой буквы выведите маску. Когда слово отгадано, выведите «Победа! Ходов: <k>» и закончите (лишний ввод не читать).',
     'solution': MASK + '\nword = input()\nopened = set()\nmoves = 0\nwhile not all(ch in opened for ch in word):\n    opened.add(input().lower())\n    moves += 1\n    print(mask(word, opened))\nprint(f"Победа! Ходов: {moves}")', 'inputs': [['кот', 'о', 'т', 'к'], ['аа', 'А'], ['питон', 'а', 'п', 'и', 'т', 'о', 'н']], 'require': ['while']},
    {'id': 'hang-03', 'title': 'Шесть ошибок', 'statement': 'Как в прошлой задаче, но буква, которой нет в слове, — ошибка: выведите маску и «Ошибок: <k>». После 6 ошибок выведите «Поражение. Слово: <слово>» и закончите.',
     'solution': MASK + '\nword = input()\nopened = set()\nerrors = 0\nmoves = 0\nwhile errors < 6 and not all(ch in opened for ch in word):\n    ch = input().lower()\n    opened.add(ch)\n    moves += 1\n    print(mask(word, opened))\n    if ch not in word:\n        errors += 1\n        print(f"Ошибок: {errors}")\nif errors == 6:\n    print(f"Поражение. Слово: {word}")\nelse:\n    print(f"Победа! Ходов: {moves}")',
     'inputs': [['кот', 'а', 'о', 'т', 'к'], ['ёж', 'а', 'б', 'в', 'г', 'д', 'е'], ['мир', 'м', 'и', 'р']], 'require': ['while']},
    {'id': 'hang-04', 'title': 'Защита от ошибок ввода', 'statement': 'Добавьте проверки: если введена не одна буква — «Введите одну букву», ход не засчитывается; если буква уже была — «Уже было», тоже не засчитывается. В остальном — как в прошлой задаче.',
     'solution': MASK + '\nword = input()\nopened = set()\nerrors = 0\nmoves = 0\nwhile errors < 6 and not all(ch in opened for ch in word):\n    ch = input().lower()\n    if len(ch) != 1 or not ch.isalpha():\n        print("Введите одну букву")\n        continue\n    if ch in opened:\n        print("Уже было")\n        continue\n    opened.add(ch)\n    moves += 1\n    print(mask(word, opened))\n    if ch not in word:\n        errors += 1\n        print(f"Ошибок: {errors}")\nif errors == 6:\n    print(f"Поражение. Слово: {word}")\nelse:\n    print(f"Победа! Ходов: {moves}")',
     'inputs': [['кот', 'ко', 'о', 'О', '1', 'к', 'т'], ['да', 'я', 'я', 'д', 'а']], 'require': ['while', 'def']},
    {'id': 'hang-05', 'title': 'Счёт игрока', 'statement': 'Дано n — число раундов. Каждый раунд: строка-слово, затем буквы до конца раунда (правила прошлой задачи без вывода маски: печатать ничего не нужно). После каждого раунда выведите «Раунд <i>: победа» или «Раунд <i>: поражение», в конце — «Побед: <k> из <n>».',
     'solution': 'def play(word):\n    opened = set()\n    errors = 0\n    while errors < 6 and not all(ch in opened for ch in word):\n        ch = input().lower()\n        if len(ch) != 1 or not ch.isalpha() or ch in opened:\n            continue\n        opened.add(ch)\n        if ch not in word:\n            errors += 1\n    return errors < 6\n\nn = int(input())\nwins = 0\nfor i in range(1, n + 1):\n    won = play(input())\n    wins += won\n    print(f"Раунд {i}: {\'победа\' if won else \'поражение\'}")\nprint(f"Побед: {wins} из {n}")',
     'inputs': [['2', 'кот', 'к', 'о', 'т', 'ёж', 'а', 'б', 'в', 'г', 'д', 'е'], ['1', 'аа', 'а']], 'require': ['def']},
]
