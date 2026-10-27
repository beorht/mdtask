DIR = 'm4/05-magic'
THEORY = r'''
# __str__, __repr__, @property

**Магические методы** (их имена окружены двумя подчёркиваниями) Python вызывает сам в особых ситуациях. С их помощью
свои объекты ведут себя как встроенные: печатаются красиво, складываются, сравниваются.

## __str__ и __repr__

Без них объект печатается так: `<__main__.Point object at 0x7f…>`.

```python run
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"точка {self.x};{self.y}"

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

p = Point(2, 3)
print(p)
print([p, Point(0, 0)])
```

- `__str__` — «для людей»: его используют `print` и `str()`;
- `__repr__` — «для программиста»: однозначное описание, показывается в списках и в консоли; хороший `__repr__`
  похож на код, который создаёт такой объект.

## Арифметика и сравнение

| Метод | Когда вызывается |
| --- | --- |
| `__add__(self, other)` | `a + b` |
| `__sub__`, `__mul__` | `a - b`, `a * b` |
| `__eq__(self, other)` | `a == b` |
| `__lt__(self, other)` | `a < b` (и сортировка) |
| `__len__(self)` | `len(a)` |
| `__contains__(self, x)` | `x in a` |

```python run
class Money:
    def __init__(self, sum_):
        self.sum = sum_

    def __add__(self, other):
        return Money(self.sum + other.sum)

    def __lt__(self, other):
        return self.sum < other.sum

    def __str__(self):
        return f"{self.sum} сум"

print(Money(1000) + Money(500))
print(min([Money(70), Money(30)]))
```

С `__lt__` объекты можно сортировать встроенным `sorted`.

## @property

`@property` превращает метод в «вычисляемый атрибут»: обращаются к нему без скобок. А сеттер (`@имя.setter`)
позволяет проверять присваивание — это инкапсуляция без лишних `get_`/`set_`:

```python run
class Thermometer:
    def __init__(self):
        self._c = 0

    @property
    def celsius(self):
        return self._c

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("так холодно не бывает")
        self._c = value

    @property
    def fahrenheit(self):
        return 32 + self._c * 1.8

t = Thermometer()
t.celsius = 25
print(t.celsius, t.fahrenheit)
```
'''
TASKS = [
    {'id': 'mag-01', 'title': 'Красивая печать', 'statement': 'Класс Book(title, author, year) с __str__ ««title» — author (year)» и __repr__ «Book(\'title\', \'author\', year)» (строки в одинарных кавычках). Дано n строк «название;автор;год». Выведите каждую книгу через print, а в конце — список всех книг через print(список).',
     'solution': 'class Book:\n    def __init__(self, title, author, year):\n        self.title = title\n        self.author = author\n        self.year = year\n\n    def __str__(self):\n        return f"«{self.title}» — {self.author} ({self.year})"\n\n    def __repr__(self):\n        return f"Book(\'{self.title}\', \'{self.author}\', {self.year})"\n\nbooks = []\nfor _ in range(int(input())):\n    t, a, y = input().split(";")\n    books.append(Book(t, a, int(y)))\nfor b in books:\n    print(b)\nprint(books)', 'inputs': [['2', 'Война и мир;Толстой;1869', 'Минувшие дни;Кадыри;1925'], ['1', 'X;Y;2000']], 'require': ['class:Book']},
    {'id': 'mag-02', 'title': 'Вектор', 'statement': 'Класс Vector(x, y) с __add__, __sub__, __mul__ (умножение на число), __eq__, __abs__ (длина) и __str__ «(x, y)». Даны два вектора (по строке «x y») и число k. Выведите a + b, a − b, a · k, равны ли a и b (True/False) и длину a, округлённую до двух знаков.',
     'solution': 'class Vector:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __add__(self, o):\n        return Vector(self.x + o.x, self.y + o.y)\n\n    def __sub__(self, o):\n        return Vector(self.x - o.x, self.y - o.y)\n\n    def __mul__(self, k):\n        return Vector(self.x * k, self.y * k)\n\n    def __eq__(self, o):\n        return self.x == o.x and self.y == o.y\n\n    def __abs__(self):\n        return (self.x ** 2 + self.y ** 2) ** 0.5\n\n    def __str__(self):\n        return f"({self.x}, {self.y})"\n\na = Vector(*map(int, input().split()))\nb = Vector(*map(int, input().split()))\nk = int(input())\nprint(a + b)\nprint(a - b)\nprint(a * k)\nprint(a == b)\nprint(round(abs(a), 2))', 'inputs': [['3 4', '1 2', '2'], ['1 1', '1 1', '-1']], 'require': ['class:Vector']},
    {'id': 'mag-03', 'title': 'Сортировка объектов', 'statement': 'Класс Player(name, score) с __lt__ (меньше — тот, у кого меньше очков, при равенстве — у кого имя дальше по алфавиту) и __str__ «name (score)». Дано n строк «имя очки». Отсортируйте игроков встроенным sorted по убыванию (reverse=True) и выведите.',
     'solution': 'class Player:\n    def __init__(self, name, score):\n        self.name = name\n        self.score = score\n\n    def __lt__(self, other):\n        if self.score != other.score:\n            return self.score < other.score\n        return self.name > other.name\n\n    def __str__(self):\n        return f"{self.name} ({self.score})"\n\nplayers = []\nfor _ in range(int(input())):\n    name, score = input().split()\n    players.append(Player(name, int(score)))\nfor p in sorted(players, reverse=True):\n    print(p)', 'inputs': [['4', 'Бек 50', 'Аня 70', 'Али 50', 'Вали 10'], ['1', 'Я 0']], 'require': ['class:Player']},
    {'id': 'mag-04', 'title': 'Корзина', 'statement': 'Класс Cart: add(name, price), __len__ (число товаров), __contains__ (есть ли товар по имени), свойство total (@property) — сумма. Команды до «стоп»: «add имя цена», «has имя» (вывести Да/Нет), «len», «total».',
     'solution': 'class Cart:\n    def __init__(self):\n        self.items = {}\n\n    def add(self, name, price):\n        self.items[name] = price\n\n    def __len__(self):\n        return len(self.items)\n\n    def __contains__(self, name):\n        return name in self.items\n\n    @property\n    def total(self):\n        return sum(self.items.values())\n\ncart = Cart()\nwhile True:\n    p = input().split()\n    if p[0] == "стоп":\n        break\n    if p[0] == "add":\n        cart.add(p[1], int(p[2]))\n    elif p[0] == "has":\n        print("Да" if p[1] in cart else "Нет")\n    elif p[0] == "len":\n        print(len(cart))\n    elif p[0] == "total":\n        print(cart.total)', 'inputs': [['add хлеб 4000', 'add сыр 45000', 'has сыр', 'has чай', 'len', 'total', 'стоп'], ['len', 'total', 'стоп']], 'require': ['class:Cart', 'decorator']},
    {'id': 'mag-05', 'title': 'Температура со свойством', 'statement': 'Класс Temperature со свойством celsius (сеттер не даёт поставить ниже −273.15: выбрасывает ValueError) и вычисляемыми свойствами fahrenheit и kelvin. Дано n значений — для каждого попробуйте присвоить celsius и выведите «C = …, F = …, K = …» (F и K округлить до двух знаков) или «Ошибка: ниже абсолютного нуля».',
     'solution': 'class Temperature:\n    def __init__(self):\n        self._c = 0.0\n\n    @property\n    def celsius(self):\n        return self._c\n\n    @celsius.setter\n    def celsius(self, value):\n        if value < -273.15:\n            raise ValueError("ниже абсолютного нуля")\n        self._c = value\n\n    @property\n    def fahrenheit(self):\n        return self._c * 9 / 5 + 32\n\n    @property\n    def kelvin(self):\n        return self._c + 273.15\n\nt = Temperature()\nfor _ in range(int(input())):\n    v = float(input())\n    try:\n        t.celsius = v\n    except ValueError as e:\n        print(f"Ошибка: {e}")\n    else:\n        print(f"C = {t.celsius}, F = {round(t.fahrenheit, 2)}, K = {round(t.kelvin, 2)}")', 'inputs': [['3', '25', '-300', '-273.15'], ['1', '100']], 'require': ['class:Temperature', 'decorator', 'try']},
]
