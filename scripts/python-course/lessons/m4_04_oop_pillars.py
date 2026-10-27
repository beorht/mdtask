DIR = 'm4/04-oop-pillars'
THEORY = r'''
# Инкапсуляция, наследование, полиморфизм, абстракция

Четыре идеи, на которых держится ООП.

## Инкапсуляция

Объект **сам отвечает за свои данные**: снаружи с ним работают через методы, а не меняют атрибуты напрямую. Так метод
может проверить, что данные остаются правильными (баланс не уходит в минус, возраст не отрицательный).

В Python атрибут, который не предназначен для использования снаружи, начинают с подчёркивания: `self._balance`. Это
соглашение — Python не запрещает доступ, но программист видит: «не трогай напрямую». Два подчёркивания (`__secret`)
дополнительно искажают имя.

## Наследование

Класс-**наследник** получает всё от **родителя** и добавляет своё:

```python run
class Animal:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name}: {self.sound()}"

    def sound(self):
        return "..."

class Cat(Animal):
    def sound(self):
        return "мяу"

class Dog(Animal):
    def sound(self):
        return "гав"

for a in [Cat("Барсик"), Dog("Шарик"), Animal("Рыбка")]:
    print(a.describe())
```

`class Cat(Animal)` — `Cat` наследует `Animal`. Метод, объявленный в наследнике с тем же именем, **переопределяет**
родительский.

## super()

Чтобы в наследнике вызвать метод родителя — например, его конструктор, — пишут `super()`:

```python run
class Teacher:
    def __init__(self, full_name, subject):
        self.full_name = full_name
        self.subject = subject

class Curator(Teacher):
    def __init__(self, full_name, subject, group):
        super().__init__(full_name, subject)
        self.group = group

c = Curator("Лола Каримова", "Python", "IB")
print(c.full_name, c.subject, c.group)
```

## Полиморфизм

Один и тот же вызов работает по-разному для разных объектов: `a.sound()` у кошки даёт «мяу», у собаки — «гав». Код,
который обрабатывает список животных, не проверяет тип каждого — он просто вызывает метод.

## Абстракция

Родительский класс описывает **что** умеют все наследники, не говоря **как**. Модуль `abc` позволяет запретить
создавать объекты такого «абстрактного» класса:

```python run
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

try:
    Shape()
except TypeError:
    print("абстрактный класс создать нельзя")
```

`isinstance(obj, Класс)` проверяет, является ли объект экземпляром класса (или его наследника).
'''
SHAPES = 'import math\nfrom abc import ABC, abstractmethod\n\nclass Shape(ABC):\n    @abstractmethod\n    def area(self):\n        pass\n\n    @abstractmethod\n    def name(self):\n        pass\n\nclass Circle(Shape):\n    def __init__(self, r):\n        self.r = r\n\n    def area(self):\n        return math.pi * self.r ** 2\n\n    def name(self):\n        return "круг"\n\nclass Rect(Shape):\n    def __init__(self, w, h):\n        self.w = w\n        self.h = h\n\n    def area(self):\n        return self.w * self.h\n\n    def name(self):\n        return "прямоугольник"\n\nclass Square(Rect):\n    def __init__(self, a):\n        super().__init__(a, a)\n\n    def name(self):\n        return "квадрат"\n\ndef make(parts):\n    kind = parts[0]\n    nums = list(map(float, parts[1:]))\n    if kind == "круг":\n        return Circle(*nums)\n    if kind == "прямоугольник":\n        return Rect(*nums)\n    return Square(*nums)\n'
TASKS = [
    {'id': 'oop-01', 'title': 'Защищённый возраст', 'statement': 'Класс Person(name, age) хранит возраст в атрибуте _age и меняет его только методом set_age(value): если значение не от 0 до 150 — вернуть False и не менять. Метод get_age(). Первая строка — «имя возраст», дальше n новых значений (n во второй строке); на неудачу выводите «Неверный возраст: <значение>». В конце — «<имя>: <возраст>».',
     'solution': 'class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self._age = age\n\n    def get_age(self):\n        return self._age\n\n    def set_age(self, value):\n        if not 0 <= value <= 150:\n            return False\n        self._age = value\n        return True\n\nname, age = input().split()\np = Person(name, int(age))\nn = int(input())\nfor _ in range(n):\n    v = int(input())\n    if not p.set_age(v):\n        print(f"Неверный возраст: {v}")\nprint(f"{p.name}: {p.get_age()}")', 'inputs': [['Ли 20', '3', '25', '-5', '200'], ['Аня 1', '0']], 'require': ['class:Person']},
    {'id': 'oop-02', 'title': 'Животные', 'statement': 'Базовый класс Animal(name) с методом describe(), возвращающим «<name> говорит <sound()>», и наследники Cat («мяу»), Dog («гав»), Cow («муу»), переопределяющие sound(). Дано n строк «вид имя» (cat, dog, cow) — выведите describe() для каждого.',
     'solution': 'class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def sound(self):\n        return "..."\n\n    def describe(self):\n        return f"{self.name} говорит {self.sound()}"\n\nclass Cat(Animal):\n    def sound(self):\n        return "мяу"\n\nclass Dog(Animal):\n    def sound(self):\n        return "гав"\n\nclass Cow(Animal):\n    def sound(self):\n        return "муу"\n\nKINDS = {"cat": Cat, "dog": Dog, "cow": Cow}\nn = int(input())\nfor _ in range(n):\n    kind, name = input().split()\n    print(KINDS[kind](name).describe())', 'inputs': [['3', 'cat Барсик', 'dog Шарик', 'cow Бурёнка'], ['1', 'dog Рекс']], 'require': ['class:Animal', 'class:Cat', 'class:Dog', 'class:Cow']},
    {'id': 'oop-03', 'title': 'Сотрудники', 'statement': 'Класс Employee(name, salary) с методом monthly() = salary; Manager(name, salary, bonus) наследует Employee (конструктор через super()) и в monthly() добавляет bonus. Дано n строк «emp имя оклад» или «man имя оклад премия». Выведите «имя: выплата» и в конце «Фонд: <сумма выплат>».',
     'solution': 'class Employee:\n    def __init__(self, name, salary):\n        self.name = name\n        self.salary = salary\n\n    def monthly(self):\n        return self.salary\n\nclass Manager(Employee):\n    def __init__(self, name, salary, bonus):\n        super().__init__(name, salary)\n        self.bonus = bonus\n\n    def monthly(self):\n        return super().monthly() + self.bonus\n\nstaff = []\nn = int(input())\nfor _ in range(n):\n    p = input().split()\n    if p[0] == "emp":\n        staff.append(Employee(p[1], int(p[2])))\n    else:\n        staff.append(Manager(p[1], int(p[2]), int(p[3])))\ntotal = 0\nfor e in staff:\n    print(f"{e.name}: {e.monthly()}")\n    total += e.monthly()\nprint(f"Фонд: {total}")', 'inputs': [['3', 'emp Али 5000000', 'man Лола 8000000 2000000', 'emp Бек 4500000'], ['1', 'man Я 1 1']], 'require': ['class:Employee', 'class:Manager']},
    {'id': 'oop-04', 'title': 'Фигуры', 'statement': 'Абстрактный класс Shape (модуль abc) с абстрактными методами area() и name(); наследники Circle(r), Rect(w, h) и Square(a) — наследник Rect. Дано n строк «круг r», «прямоугольник w h», «квадрат a». Выведите «name: площадь» (площадь округлить до двух знаков), затем «Наибольшая: <name>».',
     'solution': SHAPES + '\nshapes = [make(input().split()) for _ in range(int(input()))]\nbest = shapes[0]\nfor s in shapes:\n    print(f"{s.name()}: {round(s.area(), 2)}")\n    if s.area() > best.area():\n        best = s\nprint(f"Наибольшая: {best.name()}")', 'inputs': [['3', 'круг 1', 'прямоугольник 2 3', 'квадрат 2'], ['1', 'круг 0.5']], 'require': ['class:Shape', 'class:Circle', 'class:Rect', 'class:Square', 'import:abc']},
    {'id': 'oop-05', 'title': 'Проверка типов', 'statement': 'Используя классы фигур из прошлой задачи, по тем же входным данным выведите три строки: сколько фигур являются прямоугольниками (isinstance(s, Rect) — квадраты тоже считаются), сколько квадратов и общую площадь всех фигур (округлить до двух знаков).',
     'solution': SHAPES + '\nshapes = [make(input().split()) for _ in range(int(input()))]\nprint(sum(1 for s in shapes if isinstance(s, Rect)))\nprint(sum(1 for s in shapes if isinstance(s, Square)))\nprint(round(sum(s.area() for s in shapes), 2))', 'inputs': [['4', 'круг 1', 'прямоугольник 2 3', 'квадрат 2', 'квадрат 1'], ['1', 'круг 2']], 'require': ['class:Rect', 'class:Square']},
]
