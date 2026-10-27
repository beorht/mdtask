class Person:
    def __init__(self, name, age):
        self.name = name
        self._age = age

    def get_age(self):
        return self._age

    def set_age(self, value):
        if not 0 <= value <= 150:
            return False
        self._age = value
        return True

name, age = input().split()
p = Person(name, int(age))
n = int(input())
for _ in range(n):
    v = int(input())
    if not p.set_age(v):
        print(f"Неверный возраст: {v}")
print(f"{p.name}: {p.get_age()}")
