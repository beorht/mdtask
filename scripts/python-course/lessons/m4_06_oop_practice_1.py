DIR = 'm4/06-oop-practice-1'
THEORY = r'''
# Практика ООП, часть 1

В этом уроке — классы, которые моделируют знакомые вещи: дроби, время, очередь, библиотеку. Перед кодом ответьте на
три вопроса:

1. **Какие данные** хранит объект (атрибуты)?
2. **Что он умеет** (методы)? Какие действия меняют объект, а какие возвращают новый?
3. **Какие правила** должны всегда выполняться (дробь сокращена, минуты меньше 60, книгу нельзя выдать дважды)?
   Их проверяют конструктор и методы — это и есть инкапсуляция.

## Неизменяемые «значения»

Дробь, время, денежная сумма — это **значения**: `a + b` не меняет `a`, а возвращает новый объект. Такие классы
удобно делать с `__add__`, `__eq__`, `__str__`.

```python run
from math import gcd

class Ratio:
    def __init__(self, a, b):
        g = gcd(a, b)
        self.a, self.b = a // g, b // g

    def __str__(self):
        return f"{self.a}:{self.b}"

print(Ratio(10, 4))
```

## Объекты-«контейнеры»

Очередь, библиотека, корзина хранят другие объекты и **меняются** методами (`add`, `remove`). Их удобно строить на
списке или словаре внутри.

## Объекты, которые знают друг о друге

Библиотека хранит книги, книга знает, у кого она сейчас. Связи между объектами — это обычные атрибуты, ссылающиеся на
другие объекты (или их имена).

## Ошибки как исключения

Если метод не может выполнить действие (выдать уже выданную книгу), он может вернуть `False` — или выбросить
исключение (`raise ValueError("…")`), которое вызывающий код обработает в `try/except`. Второй способ лучше, когда
ошибка не должна пройти незамеченной.
'''
FRACTION = 'from math import gcd\n\nclass Fraction:\n    def __init__(self, num, den):\n        if den == 0:\n            raise ZeroDivisionError("знаменатель 0")\n        if den < 0:\n            num, den = -num, -den\n        g = gcd(num, den)\n        self.num = num // g\n        self.den = den // g\n\n    def __add__(self, o):\n        return Fraction(self.num * o.den + o.num * self.den, self.den * o.den)\n\n    def __sub__(self, o):\n        return Fraction(self.num * o.den - o.num * self.den, self.den * o.den)\n\n    def __mul__(self, o):\n        return Fraction(self.num * o.num, self.den * o.den)\n\n    def __truediv__(self, o):\n        return Fraction(self.num * o.den, self.den * o.num)\n\n    def __eq__(self, o):\n        return self.num == o.num and self.den == o.den\n\n    def __str__(self):\n        return str(self.num) if self.den == 1 else f"{self.num}/{self.den}"\n'
TASKS = [
    {'id': 'op1-01', 'title': 'Дроби', 'statement': 'Класс Fraction(num, den): всегда хранится сокращённой, знак — в числителе; __add__, __sub__, __mul__, __truediv__, __eq__, __str__ («3/4», а целая дробь — просто «2»). Даны две дроби «a/b» — выведите их сумму, разность, произведение, частное и равны ли они (True/False). Если делить на нулевую дробь — вместо частного «деление на ноль».',
     'solution': FRACTION + '\ndef parse(s):\n    a, b = s.split("/")\n    return Fraction(int(a), int(b))\n\nx = parse(input())\ny = parse(input())\nprint(x + y)\nprint(x - y)\nprint(x * y)\ntry:\n    print(x / y)\nexcept ZeroDivisionError:\n    print("деление на ноль")\nprint(x == y)', 'inputs': [['1/2', '1/3'], ['2/4', '-3/6'], ['3/1', '0/5'], ['5/10', '1/2']], 'require': ['class:Fraction'], 'forbid': ['import:fractions']},
    {'id': 'op1-02', 'title': 'Время', 'statement': 'Класс Time(h, m) для времени суток: add(minutes) возвращает новое время (через полночь — с начала суток), __str__ «ЧЧ:ММ», __lt__ для сравнения. Даны время «ЧЧ:ММ» и n длительностей в минутах — выведите время после каждого прибавления (каждое — к исходному), затем самое раннее из полученных.',
     'solution': 'class Time:\n    def __init__(self, h, m):\n        total = (h * 60 + m) % 1440\n        self.h, self.m = divmod(total, 60)\n\n    def add(self, minutes):\n        return Time(self.h, self.m + minutes)\n\n    def __lt__(self, o):\n        return (self.h, self.m) < (o.h, o.m)\n\n    def __str__(self):\n        return f"{self.h:02d}:{self.m:02d}"\n\nh, m = map(int, input().split(":"))\nstart = Time(h, m)\nresults = []\nfor _ in range(int(input())):\n    t = start.add(int(input()))\n    results.append(t)\n    print(t)\nprint(min(results))', 'inputs': [['23:30', '3', '45', '10', '1440'], ['08:05', '2', '-10', '600']], 'require': ['class:Time'], 'forbid': ['import:datetime']},
    {'id': 'op1-03', 'title': 'Очередь в поликлинику', 'statement': 'Класс Queue: enqueue(name), dequeue() (первый в очереди или исключение IndexError, если пусто), __len__, __str__ — имена через « <- » или «(пусто)». Команды до «стоп»: «встать имя», «принять» (вывести «Принят: имя» или «Очередь пуста»), «показать».',
     'solution': 'class Queue:\n    def __init__(self):\n        self.items = []\n\n    def enqueue(self, name):\n        self.items.append(name)\n\n    def dequeue(self):\n        if not self.items:\n            raise IndexError("пусто")\n        return self.items.pop(0)\n\n    def __len__(self):\n        return len(self.items)\n\n    def __str__(self):\n        return " <- ".join(self.items) if self.items else "(пусто)"\n\nq = Queue()\nwhile True:\n    cmd, _, arg = input().partition(" ")\n    if cmd == "стоп":\n        break\n    if cmd == "встать":\n        q.enqueue(arg)\n    elif cmd == "принять":\n        try:\n            print(f"Принят: {q.dequeue()}")\n        except IndexError:\n            print("Очередь пуста")\n    elif cmd == "показать":\n        print(q)', 'inputs': [['встать Али', 'встать Бек', 'показать', 'принять', 'принять', 'принять', 'показать', 'стоп'], ['принять', 'встать Ян', 'встать Ли', 'встать Ро', 'принять', 'показать', 'стоп']], 'require': ['class:Queue', 'try']},
    {'id': 'op1-04', 'title': 'Библиотека', 'statement': 'Классы Book(title) с атрибутом reader (None — книга на полке) и Library с методами add(title), borrow(title, reader), give_back(title). Ошибки — исключения ValueError с текстом: «нет книги», «уже выдана», «не выдавалась». Команды до «стоп»: «добавить название», «выдать название читатель», «вернуть название», «отчёт» (книги по алфавиту: «название — читатель» или «название — на полке»). На ошибку выводите «Ошибка: <текст>». Названия — одно слово.',
     'solution': 'class Book:\n    def __init__(self, title):\n        self.title = title\n        self.reader = None\n\nclass Library:\n    def __init__(self):\n        self.books = {}\n\n    def add(self, title):\n        self.books[title] = Book(title)\n\n    def _get(self, title):\n        if title not in self.books:\n            raise ValueError("нет книги")\n        return self.books[title]\n\n    def borrow(self, title, reader):\n        book = self._get(title)\n        if book.reader is not None:\n            raise ValueError("уже выдана")\n        book.reader = reader\n\n    def give_back(self, title):\n        book = self._get(title)\n        if book.reader is None:\n            raise ValueError("не выдавалась")\n        book.reader = None\n\n    def report(self):\n        for t in sorted(self.books):\n            r = self.books[t].reader\n            print(f"{t} — {r if r else \'на полке\'}")\n\nlib = Library()\nwhile True:\n    p = input().split()\n    if p[0] == "стоп":\n        break\n    try:\n        if p[0] == "добавить":\n            lib.add(p[1])\n        elif p[0] == "выдать":\n            lib.borrow(p[1], p[2])\n        elif p[0] == "вернуть":\n            lib.give_back(p[1])\n        elif p[0] == "отчёт":\n            lib.report()\n    except ValueError as e:\n        print(f"Ошибка: {e}")', 'inputs': [['добавить Кобзарь', 'добавить Алпамыш', 'выдать Алпамыш Лола', 'выдать Алпамыш Бек', 'вернуть Кобзарь', 'выдать Тень Али', 'отчёт', 'вернуть Алпамыш', 'отчёт', 'стоп'], ['вернуть Х', 'добавить Х', 'выдать Х Я', 'вернуть Х', 'вернуть Х', 'отчёт', 'стоп']], 'require': ['class:Book', 'class:Library', 'try']},
    {'id': 'op1-05', 'title': 'Матрица', 'statement': 'Класс Matrix(rows) — список строк чисел. __add__ (поэлементно; размеры разные — ValueError), __mul__ (матричное произведение; несовместимые размеры — ValueError), __str__ — строки через пробел. Даны две матрицы: размеры «r c», затем строки. Выведите A + B (или «нельзя сложить»), пустую строку «---» и A × B (или «нельзя умножить»).',
     'solution': 'class Matrix:\n    def __init__(self, rows):\n        self.rows = rows\n        self.r = len(rows)\n        self.c = len(rows[0])\n\n    def __add__(self, o):\n        if (self.r, self.c) != (o.r, o.c):\n            raise ValueError("размеры")\n        return Matrix([[self.rows[i][j] + o.rows[i][j] for j in range(self.c)] for i in range(self.r)])\n\n    def __mul__(self, o):\n        if self.c != o.r:\n            raise ValueError("размеры")\n        return Matrix([[sum(self.rows[i][k] * o.rows[k][j] for k in range(self.c)) for j in range(o.c)] for i in range(self.r)])\n\n    def __str__(self):\n        return "\\n".join(" ".join(map(str, row)) for row in self.rows)\n\ndef read():\n    r, c = map(int, input().split())\n    return Matrix([list(map(int, input().split())) for _ in range(r)])\n\na = read()\nb = read()\ntry:\n    print(a + b)\nexcept ValueError:\n    print("нельзя сложить")\nprint("---")\ntry:\n    print(a * b)\nexcept ValueError:\n    print("нельзя умножить")', 'inputs': [['2 2', '1 2', '3 4', '2 2', '5 6', '7 8'], ['2 3', '1 2 3', '4 5 6', '3 1', '1', '0', '-1']], 'require': ['class:Matrix']},
]
