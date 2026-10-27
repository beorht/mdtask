DIR = 'm3/12-fizzbuzz'
THEORY = r'''
# Мини-проект FizzBuzz

**FizzBuzz** — знаменитая задача с собеседований программистов: для чисел от 1 до N вывести «Fizz», если число
делится на 3, «Buzz» — если на 5, «FizzBuzz» — если на 3 и на 5, иначе само число. Она проверяет главное: умеете ли вы
аккуратно сочетать цикл и условия.

## Порядок проверок

Самая частая ошибка — проверить делимость на 3 раньше, чем на 15: тогда до «FizzBuzz» дело не дойдёт. Либо
проверяйте сначала самый строгий случай, либо **собирайте строку**:

```python run
for n in range(9, 16):
    word = ""
    if n % 3 == 0:
        word += "Fizz"
    if n % 5 == 0:
        word += "Buzz"
    print(word or n)
```

`word or n` — если строка пустая, берётся `n`. Такой вариант легко расширять новыми правилами — без переписывания
всех условий.

## Правила как данные

Правила «делитель → слово» можно хранить списком пар и проходить циклом. Тогда добавить новое правило (например,
7 → «Bazz») — значит добавить одну пару, а не новую ветку `if`.

```python run
rules = [(2, "Чёт"), (7, "Семь")]
for n in range(12, 16):
    word = "".join(text for d, text in rules if n % d == 0)
    print(word or n)
```

## Функция, а не print

Удобнее, когда функция **возвращает** список результатов, а печатает основной код: такую функцию проще проверить и
использовать для подсчётов.
'''
FB = 'def fizzbuzz(n):\n    result = []\n    for i in range(1, n + 1):\n        word = ""\n        if i % 3 == 0:\n            word += "Fizz"\n        if i % 5 == 0:\n            word += "Buzz"\n        result.append(word or str(i))\n    return result\n'
TASKS = [
    {'id': 'fb-01', 'title': 'Классика', 'statement': 'Дано N. Для чисел от 1 до N выведите по строке: «Fizz» (делится на 3), «Buzz» (на 5), «FizzBuzz» (на 3 и на 5) или само число.',
     'solution': 'n = int(input())\nfor i in range(1, n + 1):\n    if i % 15 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)', 'inputs': [['15'], ['5'], ['1'], ['31']], 'require': ['for']},
    {'id': 'fb-02', 'title': 'Свои делители', 'statement': 'Даны N, a и b. Для чисел от 1 до N выведите в одну строку через пробел: «Fizz» для кратных a, «Buzz» для кратных b, «FizzBuzz» для кратных обоим, иначе число.',
     'solution': 'n = int(input())\na = int(input())\nb = int(input())\nout = []\nfor i in range(1, n + 1):\n    word = ("Fizz" if i % a == 0 else "") + ("Buzz" if i % b == 0 else "")\n    out.append(word or str(i))\nprint(" ".join(out))', 'inputs': [['10', '2', '3'], ['12', '4', '6'], ['5', '7', '11']]},
    {'id': 'fb-03', 'title': 'Правила из ввода', 'statement': 'Дано N, затем k и k строк «делитель слово». Для каждого числа от 1 до N склейте слова всех правил, делителю которых оно кратно (в порядке ввода правил); если ни одно не подошло — число. Выведите результаты через пробел.',
     'solution': 'n = int(input())\nk = int(input())\nrules = []\nfor _ in range(k):\n    d, word = input().split()\n    rules.append((int(d), word))\nout = []\nfor i in range(1, n + 1):\n    word = "".join(w for d, w in rules if i % d == 0)\n    out.append(word or str(i))\nprint(" ".join(out))', 'inputs': [['15', '2', '3 Fizz', '5 Buzz'], ['14', '3', '2 Ко', '7 Ла', '3 Ми'], ['3', '0']]},
    {'id': 'fb-04', 'title': 'Функция fizzbuzz', 'statement': 'Напишите функцию fizzbuzz(n), которая возвращает список строк классического FizzBuzz от 1 до n. Дано N — выведите результат через запятую и пробел.',
     'solution': FB + '\nprint(", ".join(fizzbuzz(int(input()))))', 'inputs': [['15'], ['3'], ['20']], 'require': ['def:fizzbuzz']},
    {'id': 'fb-05', 'title': 'Подсчёт', 'statement': 'Используя функцию fizzbuzz(n) из прошлой задачи, для данного N выведите, сколько раз встретились «Fizz», «Buzz», «FizzBuzz» и сколько чисел осталось, — четыре строки вида «Fizz: 4». Без метода count.',
     'solution': FB + '\nres = fizzbuzz(int(input()))\nc = {"Fizz": 0, "Buzz": 0, "FizzBuzz": 0}\nnums = 0\nfor w in res:\n    if w in c:\n        c[w] += 1\n    else:\n        nums += 1\nfor k, v in c.items():\n    print(f"{k}: {v}")\nprint(f"Чисел: {nums}")', 'inputs': [['15'], ['100'], ['2']], 'require': ['def:fizzbuzz'], 'forbid': ['.count']},
]
