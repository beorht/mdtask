DIR = 'm3/07-password'
THEORY = r'''
# Мини-проект «Генератор паролей»

Соберём инструмент, который проверяет надёжность паролей и придумывает новые. Понадобятся функции, строки, модули
`string` и `random`.

## Что делает пароль надёжным

1. Длина — не меньше 8 символов (лучше 12+).
2. Есть маленькие и большие буквы, цифры и специальные знаки.
3. Нет длинных повторов (`aaa`) и очевидных слов из «чёрного списка» (`password`, `qwerty`, `123456`).

Каждый пункт удобно оформить отдельной функцией-предикатом, а итоговую проверку — функцией, собирающей их вместе.

## Наборы символов

```python run
import string
print(string.ascii_lowercase)
print(string.ascii_uppercase)
print(string.digits)
print(string.punctuation)
```

## Генерация

Пароль из `n` случайных символов алфавита — это `n` раз `random.choice(alphabet)`:

```python run
import random, string
random.seed(1)
chars = string.ascii_letters + string.digits
print("".join(random.choice(chars) for _ in range(10)))
```

Для настоящих паролей вместо `random` берут модуль `secrets` (`secrets.choice`) — его числа нельзя предсказать по
зерну. В задачах используем `random` с зерном, чтобы ответ можно было проверить.

## Пароль из фразы

Запоминаемый пароль можно сделать из фразы: первые буквы слов, часть букв заменена похожими цифрами и знаками
(`а → @`, `о → 0`, `и → 1`) и т. п. Такую замену удобно хранить словарём «буква → замена».
'''
CHECK = '''import string

BLACKLIST = {"password", "qwerty", "123456", "12345678", "admin", "letmein"}

def problems(p):
    found = []
    if len(p) < 8:
        found.append("короче 8 символов")
    if not any(c in string.ascii_lowercase for c in p):
        found.append("нет маленьких букв")
    if not any(c in string.ascii_uppercase for c in p):
        found.append("нет больших букв")
    if not any(c in string.digits for c in p):
        found.append("нет цифр")
    if not any(c in string.punctuation for c in p):
        found.append("нет спецсимволов")
    return found
'''
TASKS = [
    {'id': 'pwd-01', 'title': 'Проверка надёжности', 'statement': 'Пароль надёжный, если в нём не меньше 8 символов, есть маленькая и большая латинская буква, цифра и знак из string.punctuation. Дан пароль — выведите «Надёжный» или «Ненадёжный:» и затем по строке на каждую проблему в этом порядке: «короче 8 символов», «нет маленьких букв», «нет больших букв», «нет цифр», «нет спецсимволов».',
     'solution': CHECK + '\np = input()\nfound = problems(p)\nif found:\n    print("Ненадёжный:")\n    for f in found:\n        print(f)\nelse:\n    print("Надёжный")', 'inputs': [['Pa$$w0rd!'], ['abc'], ['ABCDEFGH1!'], ['Qwerty12345'], ['xY7#']], 'require': ['def']},
    {'id': 'pwd-02', 'title': 'Повторы и чёрный список', 'statement': 'Дополнительные правила: пароль не должен содержать трёх одинаковых символов подряд и не должен (без учёта регистра) совпадать с одним из слов password, qwerty, 123456, 12345678, admin, letmein. Дано n и n паролей — для каждого выведите «ок», «повтор» или «из списка» (если нарушены оба — «из списка»).',
     'solution': 'BLACKLIST = {"password", "qwerty", "123456", "12345678", "admin", "letmein"}\n\ndef has_triple(p):\n    for i in range(len(p) - 2):\n        if p[i] == p[i + 1] == p[i + 2]:\n            return True\n    return False\n\nn = int(input())\nfor _ in range(n):\n    p = input()\n    if p.lower() in BLACKLIST:\n        print("из списка")\n    elif has_triple(p):\n        print("повтор")\n    else:\n        print("ок")', 'inputs': [['4', 'QWERTY', 'aaab', 'Hello1!', 'abcabc'], ['2', '111', 'admin']], 'require': ['def']},
    {'id': 'pwd-03', 'title': 'Случайный пароль', 'statement': 'Даны зерно и длина n. Алфавит — string.ascii_letters + string.digits (именно в таком порядке). Вызовите random.seed(зерно) и n раз random.choice(алфавит). Выведите пароль.',
     'solution': 'import random\nimport string\n\nrandom.seed(int(input()))\nn = int(input())\nalphabet = string.ascii_letters + string.digits\nprint("".join(random.choice(alphabet) for _ in range(n)))', 'inputs': [['1', '10'], ['2026', '16'], ['7', '4']], 'require': ['import:random']},
    {'id': 'pwd-04', 'title': 'Пароль из фразы', 'statement': 'Дана фраза. Возьмите первую букву каждого слова; у первого слова букву сделайте большой, остальные маленькими; замените буквы: а → @, о → 0, и → 1, е → 3, с → $ (после смены регистра, замена только маленьких). В конце допишите число слов. Выведите пароль.',
     'solution': 'REPL = {"а": "@", "о": "0", "и": "1", "е": "3", "с": "$"}\n\nwords = input().split()\nletters = [w[0].lower() for w in words]\nletters[0] = letters[0].upper()\nresult = "".join(REPL.get(ch, ch) for ch in letters)\nprint(result + str(len(words)))', 'inputs': [['мой кот любит спать и есть сметану'], ['Солнце встаёт очень рано'], ['одно']]},
    {'id': 'pwd-05', 'title': 'Пачка паролей', 'statement': 'Даны зерно, количество k и длина n. Алфавит — string.ascii_letters + string.digits + "!@#$%". После random.seed(зерно) сгенерируйте k паролей подряд (каждый — n вызовов random.choice). Для каждого выведите «пароль — надёжный» или «пароль — слабый» (надёжный: есть маленькая и большая буква, цифра и знак из «!@#$%»).',
     'solution': 'import random\nimport string\n\nSPECIAL = "!@#$%"\nalphabet = string.ascii_letters + string.digits + SPECIAL\n\ndef strong(p):\n    return (any(c.islower() for c in p) and any(c.isupper() for c in p)\n            and any(c.isdigit() for c in p) and any(c in SPECIAL for c in p))\n\nrandom.seed(int(input()))\nk = int(input())\nn = int(input())\nfor _ in range(k):\n    p = "".join(random.choice(alphabet) for _ in range(n))\n    print(f"{p} — {\'надёжный\' if strong(p) else \'слабый\'}")', 'inputs': [['5', '3', '12'], ['1', '2', '6'], ['77', '4', '8']], 'require': ['import:random', 'def']},
]
