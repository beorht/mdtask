import math
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

    @abstractmethod
    def name(self):
        pass

class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return math.pi * self.r ** 2

    def name(self):
        return "круг"

class Rect(Shape):
    def __init__(self, w, h):
        self.w = w
        self.h = h

    def area(self):
        return self.w * self.h

    def name(self):
        return "прямоугольник"

class Square(Rect):
    def __init__(self, a):
        super().__init__(a, a)

    def name(self):
        return "квадрат"

def make(parts):
    kind = parts[0]
    nums = list(map(float, parts[1:]))
    if kind == "круг":
        return Circle(*nums)
    if kind == "прямоугольник":
        return Rect(*nums)
    return Square(*nums)

shapes = [make(input().split()) for _ in range(int(input()))]
best = shapes[0]
for s in shapes:
    print(f"{s.name()}: {round(s.area(), 2)}")
    if s.area() > best.area():
        best = s
print(f"Наибольшая: {best.name()}")
