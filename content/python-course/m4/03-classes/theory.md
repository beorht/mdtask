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
