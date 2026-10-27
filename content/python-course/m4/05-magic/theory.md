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
