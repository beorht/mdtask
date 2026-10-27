class Animal:
    def __init__(self, name):
        self.name = name

    def sound(self):
        return "..."

    def describe(self):
        return f"{self.name} говорит {self.sound()}"

class Cat(Animal):
    def sound(self):
        return "мяу"

class Dog(Animal):
    def sound(self):
        return "гав"

class Cow(Animal):
    def sound(self):
        return "муу"

KINDS = {"cat": Cat, "dog": Dog, "cow": Cow}
n = int(input())
for _ in range(n):
    kind, name = input().split()
    print(KINDS[kind](name).describe())
