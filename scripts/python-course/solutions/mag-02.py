class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, o):
        return Vector(self.x + o.x, self.y + o.y)

    def __sub__(self, o):
        return Vector(self.x - o.x, self.y - o.y)

    def __mul__(self, k):
        return Vector(self.x * k, self.y * k)

    def __eq__(self, o):
        return self.x == o.x and self.y == o.y

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __str__(self):
        return f"({self.x}, {self.y})"

a = Vector(*map(int, input().split()))
b = Vector(*map(int, input().split()))
k = int(input())
print(a + b)
print(a - b)
print(a * k)
print(a == b)
print(round(abs(a), 2))
