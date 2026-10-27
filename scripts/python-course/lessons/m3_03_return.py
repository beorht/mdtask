DIR = 'm3/03-return'
THEORY = r'''
# Возврат значения: return

`print` показывает результат на экране, но с ним ничего нельзя сделать дальше. `return` **возвращает** значение
тому, кто вызвал функцию, — его можно сохранить в переменную, сравнить, передать в другую функцию.

```python run
def square(x):
    return x * x

a = square(4)
print(a + square(3))
```

## return и print — в чём разница

| `print(x)` в функции | `return x` |
| --- | --- |
| показывает `x` человеку | отдаёт `x` программе |
| функция возвращает `None` | вызов функции **равен** `x` |
| результат нельзя использовать в вычислениях | результат можно использовать где угодно |

```python run
def show_double(x):
    print(x * 2)

def double(x):
    return x * 2

r1 = show_double(5)
r2 = double(5)
print(r1, r2)
```

## return завершает функцию

После `return` функция сразу заканчивается — дальнейшие строки не выполняются. Это удобно для **раннего выхода**:

```python run
def has_negative(nums):
    for x in nums:
        if x < 0:
            return True
    return False

print(has_negative([3, 1, -2]), has_negative([1, 2]))
```

## Несколько значений

`return a, b` возвращает **кортеж** — его удобно сразу распаковать:

```python run
def div_mod(a, b):
    return a // b, a % b

q, r = div_mod(17, 5)
print(q, r)
```

## Функции из функций

Функции, возвращающие значения, легко комбинировать: одна вызывает другую. Например, наименьшее общее кратное
выражается через наибольший общий делитель: `НОК(a, b) = a · b / НОД(a, b)`.

## Предикаты

Функцию, которая отвечает «да / нет» (`True` / `False`), называют **предикатом** и обычно начинают имя с `is_` или
`has_`: `is_even`, `is_prime`, `has_digit`.
'''
TASKS = [
    {'id': 'ret-01', 'title': 'Чётные из списка', 'statement': 'Напишите функцию is_even(n), которая возвращает True для чётных чисел и False для нечётных. Даны числа через пробел — с её помощью выведите через пробел только чётные (или «Нет», если их нет).',
     'solution': 'def is_even(n):\n    return n % 2 == 0\n\nout = []\nfor x in map(int, input().split()):\n    if is_even(x):\n        out.append(str(x))\nprint(" ".join(out) if out else "Нет")', 'inputs': [['1 2 3 4 5 6'], ['1 3 5'], ['0 -2 7']], 'require': ['def:is_even']},
    {'id': 'ret-02', 'title': 'Простые до N', 'statement': 'Напишите функцию is_prime(n) — True, если n простое (n ≥ 2 и делится только на 1 и на себя). Делители проверяйте до квадратного корня из n. Дано N — выведите через пробел все простые числа от 2 до N.',
     'solution': 'def is_prime(n):\n    if n < 2:\n        return False\n    d = 2\n    while d * d <= n:\n        if n % d == 0:\n            return False\n        d += 1\n    return True\n\nn = int(input())\nprint(" ".join(str(x) for x in range(2, n + 1) if is_prime(x)))', 'inputs': [['20'], ['2'], ['50'], ['3']], 'require': ['def:is_prime'], 'forbid': ['import:math', 'import:sympy']},
    {'id': 'ret-03', 'title': 'НОД и НОК', 'statement': 'Напишите функции gcd(a, b) (алгоритм Евклида) и lcm(a, b) = a · b // gcd(a, b). Даны два числа — выведите их НОД и НОК через пробел.',
     'solution': 'def gcd(a, b):\n    while b:\n        a, b = b, a % b\n    return a\n\ndef lcm(a, b):\n    return a * b // gcd(a, b)\n\na = int(input())\nb = int(input())\nprint(gcd(a, b), lcm(a, b))', 'inputs': [['12', '18'], ['7', '5'], ['21', '6'], ['100', '100']], 'require': ['def:gcd', 'def:lcm'], 'forbid': ['import:math']},
    {'id': 'ret-04', 'title': 'Минимум и максимум', 'statement': 'Напишите функцию min_max(nums), которая за один проход находит и возвращает два значения — наименьшее и наибольшее. Даны числа через пробел — выведите их через пробел. Без min, max, sorted.',
     'solution': 'def min_max(nums):\n    lo = hi = nums[0]\n    for x in nums:\n        if x < lo:\n            lo = x\n        if x > hi:\n            hi = x\n    return lo, hi\n\nlo, hi = min_max(list(map(int, input().split())))\nprint(lo, hi)', 'inputs': [['3 9 -2 7'], ['5'], ['4 4 4'], ['-1 -9 -3']], 'require': ['def:min_max'], 'forbid': ['min', 'max', 'sorted', '.sort']},
    {'id': 'ret-05', 'title': 'Самая большая сумма цифр', 'statement': 'Напишите функцию digit_sum(n) — сумма цифр натурального числа (арифметикой). Даны числа через пробел — выведите то, у которого сумма цифр наибольшая (при равенстве — первое), и саму сумму.',
     'solution': 'def digit_sum(n):\n    s = 0\n    while n > 0:\n        s += n % 10\n        n //= 10\n    return s\n\nbest = None\nfor x in map(int, input().split()):\n    if best is None or digit_sum(x) > digit_sum(best):\n        best = x\nprint(best, digit_sum(best))', 'inputs': [['19 28 100'], ['5'], ['111 3 21'], ['999 9999 18']], 'require': ['def:digit_sum'], 'forbid': ['str', 'max', 'sum']},
    {'id': 'ret-06', 'title': 'Палиндром', 'statement': 'Напишите функцию is_palindrome(text): True, если строка читается одинаково слева направо и справа налево без учёта пробелов и регистра. Строку не разворачивайте срезом — сравнивайте символы с двух концов. Дано n и n строк — для каждой выведите «Да» или «Нет».',
     'solution': 'def is_palindrome(text):\n    s = text.replace(" ", "").lower()\n    i, j = 0, len(s) - 1\n    while i < j:\n        if s[i] != s[j]:\n            return False\n        i += 1\n        j -= 1\n    return True\n\nn = int(input())\nfor _ in range(n):\n    print("Да" if is_palindrome(input()) else "Нет")', 'inputs': [['3', 'А роза упала на лапу Азора', 'Python', 'Шалаш'], ['2', 'а', 'аб']], 'require': ['def:is_palindrome'], 'forbid': ['reversed']},
]

# Задачи, перенесённые из банка задач Python (переделаны под автопроверку, 27.10.2026).
TASKS += [
    {'id': 'pyb-10', 'title': 'Статистика списка', 'statement': 'Напишите функцию stats(numbers), которая возвращает кортеж (минимум, максимум, среднее) — только циклом, без min, max и sum. Дана строка целых чисел через пробел. Выведите «Минимум: …», «Максимум: …», «Среднее: …» (среднее — round до 2 знаков). Решение — на Python.', 'solution': 'def stats(numbers):\n    lo = hi = numbers[0]\n    total = 0\n    for x in numbers:\n        if x < lo:\n            lo = x\n        if x > hi:\n            hi = x\n        total += x\n    return lo, hi, total / len(numbers)\n\nnums = [int(x) for x in input().split()]\nlo, hi, avg = stats(nums)\nprint(f"Минимум: {lo}")\nprint(f"Максимум: {hi}")\nprint(f"Среднее: {round(avg, 2)}")', 'inputs': [['3 9 -2 7 4 10 1 8 5 6'], ['42'], ['-5 -1 -9']], 'require': ['def:stats'], 'forbid': ['min', 'max', 'sum']},
]
