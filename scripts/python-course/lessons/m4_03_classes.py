DIR = 'm4/03-classes'
THEORY = r'''
# Классы и объекты

До сих пор данные (переменные, словари) и действия над ними (функции) жили отдельно. **Объектно-ориентированное
программирование** (ООП) объединяет их: **класс** описывает, какие данные и действия есть у объектов определённого
вида, а **объект** — конкретный экземпляр.

| Класс | Объекты |
| --- | --- |
| `Student` — у студента есть имя, группа, оценки; он может получить оценку | Азиз из IB, Нигора из WEB |
| `BankAccount` — у счёта есть владелец и баланс; можно пополнить и снять | счёт Азиза, счёт Нигоры |

## Объявление класса

```python run
class Student:
    def __init__(self, name, group):
        self.name = name
        self.group = group
        self.grades = []

    def add_grade(self, grade):
        self.grades.append(grade)

    def average(self):
        if not self.grades:
            return 0
        return sum(self.grades) / len(self.grades)

s = Student("Азиз", "IB")
s.add_grade(5)
s.add_grade(4)
print(s.name, s.group, s.average())
```

- Имена классов пишут с большой буквы: `Student`, `BankAccount`.
- `__init__` — **конструктор**: вызывается при создании объекта `Student(...)` и задаёт начальные данные.
- `self` — сам объект; через него метод обращается к данным: `self.name`. При вызове `s.add_grade(5)` Python сам
  передаёт `s` как `self`.
- Данные объекта (`self.name`) называют **атрибутами**, функции класса — **методами**.

## Каждый объект — свой

```python run
class Counter:
    def __init__(self):
        self.value = 0

    def click(self):
        self.value += 1

a = Counter()
b = Counter()
a.click()
a.click()
b.click()
print(a.value, b.value)
```

## Атрибуты класса

Переменная, объявленная прямо в теле класса, общая для всех объектов:

```python run
class Ticket:
    price = 40000

    def __init__(self, seat):
        self.seat = seat

print(Ticket(5).price, Ticket(7).price)
```

## Объекты в списке

Объекты удобно хранить в списках и словарях и обрабатывать в цикле — как раньше обрабатывали словари с полями, только
теперь у каждого «словаря» есть свои методы.
'''
TASKS = [
    {'id': 'cls-01', 'title': 'Прямоугольник', 'statement': 'Опишите класс Rectangle с атрибутами width, height и методами area() и perimeter(). Дано n и n строк «ширина высота» — для каждого прямоугольника выведите «S = <площадь>, P = <периметр>».',
     'solution': 'class Rectangle:\n    def __init__(self, width, height):\n        self.width = width\n        self.height = height\n\n    def area(self):\n        return self.width * self.height\n\n    def perimeter(self):\n        return 2 * (self.width + self.height)\n\nn = int(input())\nfor _ in range(n):\n    w, h = map(int, input().split())\n    r = Rectangle(w, h)\n    print(f"S = {r.area()}, P = {r.perimeter()}")', 'inputs': [['2', '3 4', '10 10'], ['1', '1 7']], 'require': ['class:Rectangle']},
    {'id': 'cls-02', 'title': 'Банковский счёт', 'statement': 'Класс BankAccount(owner) с балансом 0 и методами deposit(x) и withdraw(x) (если денег мало — вернуть False, иначе снять и вернуть True). Первая строка — владелец, дальше команды «+x» / «-x» до «стоп». На неудачное снятие выводите «Отказ». В конце — «<владелец>: <баланс>».',
     'solution': 'class BankAccount:\n    def __init__(self, owner):\n        self.owner = owner\n        self.balance = 0\n\n    def deposit(self, x):\n        self.balance += x\n\n    def withdraw(self, x):\n        if x > self.balance:\n            return False\n        self.balance -= x\n        return True\n\nacc = BankAccount(input())\nwhile True:\n    cmd = input()\n    if cmd == "стоп":\n        break\n    if cmd[0] == "+":\n        acc.deposit(int(cmd[1:]))\n    elif not acc.withdraw(int(cmd[1:])):\n        print("Отказ")\nprint(f"{acc.owner}: {acc.balance}")', 'inputs': [['Азиз', '+100', '-30', '-100', '+5', 'стоп'], ['Ли', 'стоп']], 'require': ['class:BankAccount']},
    {'id': 'cls-03', 'title': 'Студенты', 'statement': 'Класс Student(name) со списком оценок, методами add_grade(g) и average() (0, если оценок нет). Дано n строк «имя оценка». Создавайте студента при первом появлении имени. Выведите студентов в порядке появления: «имя: среднее» (округлить до двух знаков).',
     'solution': 'class Student:\n    def __init__(self, name):\n        self.name = name\n        self.grades = []\n\n    def add_grade(self, g):\n        self.grades.append(g)\n\n    def average(self):\n        return sum(self.grades) / len(self.grades) if self.grades else 0\n\nn = int(input())\nstudents = {}\nfor _ in range(n):\n    name, g = input().split()\n    if name not in students:\n        students[name] = Student(name)\n    students[name].add_grade(int(g))\nfor s in students.values():\n    print(f"{s.name}: {round(s.average(), 2)}")', 'inputs': [['5', 'Али 5', 'Вали 4', 'Али 3', 'Гани 5', 'Вали 5'], ['1', 'Я 4']], 'require': ['class:Student']},
    {'id': 'cls-04', 'title': 'Стек', 'statement': 'Класс Stack на основе списка: push(x), pop() (возвращает верхний элемент или None, если пусто), peek(), is_empty(), size(). Команды до «стоп»: «push x», «pop» (вывести результат или «пусто»), «peek» (так же), «size».',
     'solution': 'class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, x):\n        self.items.append(x)\n\n    def pop(self):\n        return self.items.pop() if self.items else None\n\n    def peek(self):\n        return self.items[-1] if self.items else None\n\n    def is_empty(self):\n        return not self.items\n\n    def size(self):\n        return len(self.items)\n\ns = Stack()\nwhile True:\n    parts = input().split()\n    if parts[0] == "стоп":\n        break\n    if parts[0] == "push":\n        s.push(parts[1])\n    elif parts[0] in ("pop", "peek"):\n        r = s.pop() if parts[0] == "pop" else s.peek()\n        print("пусто" if r is None else r)\n    elif parts[0] == "size":\n        print(s.size())', 'inputs': [['push 1', 'push 2', 'peek', 'pop', 'pop', 'pop', 'size', 'стоп'], ['size', 'стоп']], 'require': ['class:Stack']},
    {'id': 'cls-05', 'title': 'Скобки через стек', 'statement': 'Используя свой класс Stack, проверьте строку из скобок ()[]{}: правильная ли она (каждая открывающая закрыта нужной в правильном порядке). Дано n строк — для каждой «Да» или «Нет».',
     'solution': 'class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, x):\n        self.items.append(x)\n\n    def pop(self):\n        return self.items.pop() if self.items else None\n\n    def is_empty(self):\n        return not self.items\n\nPAIRS = {")": "(", "]": "[", "}": "{"}\n\ndef balanced(s):\n    st = Stack()\n    for ch in s:\n        if ch in "([{":\n            st.push(ch)\n        elif ch in PAIRS:\n            if st.pop() != PAIRS[ch]:\n                return False\n    return st.is_empty()\n\nn = int(input())\nfor _ in range(n):\n    print("Да" if balanced(input()) else "Нет")', 'inputs': [['4', '([]{})', '([)]', '((', '{[()()]}'], ['2', ')', '']], 'require': ['class:Stack']},
    {'id': 'cls-06', 'title': 'Счётчик посещений', 'statement': 'Класс Page(url) с атрибутом класса total_views (общий для всех страниц) и атрибутом объекта views. Метод visit() увеличивает оба. Дано n строк-адресов посещений. Выведите адреса в порядке первого появления с числом посещений «url: k» и в конце «Всего: <total_views>».',
     'solution': 'class Page:\n    total_views = 0\n\n    def __init__(self, url):\n        self.url = url\n        self.views = 0\n\n    def visit(self):\n        self.views += 1\n        Page.total_views += 1\n\nn = int(input())\npages = {}\nfor _ in range(n):\n    url = input()\n    if url not in pages:\n        pages[url] = Page(url)\n    pages[url].visit()\nfor p in pages.values():\n    print(f"{p.url}: {p.views}")\nprint(f"Всего: {Page.total_views}")', 'inputs': [['5', '/home', '/news', '/home', '/about', '/home'], ['0']], 'require': ['class:Page']},
]
