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
