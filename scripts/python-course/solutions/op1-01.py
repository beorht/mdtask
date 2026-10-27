from math import gcd

class Fraction:
    def __init__(self, num, den):
        if den == 0:
            raise ZeroDivisionError("знаменатель 0")
        if den < 0:
            num, den = -num, -den
        g = gcd(num, den)
        self.num = num // g
        self.den = den // g

    def __add__(self, o):
        return Fraction(self.num * o.den + o.num * self.den, self.den * o.den)

    def __sub__(self, o):
        return Fraction(self.num * o.den - o.num * self.den, self.den * o.den)

    def __mul__(self, o):
        return Fraction(self.num * o.num, self.den * o.den)

    def __truediv__(self, o):
        return Fraction(self.num * o.den, self.den * o.num)

    def __eq__(self, o):
        return self.num == o.num and self.den == o.den

    def __str__(self):
        return str(self.num) if self.den == 1 else f"{self.num}/{self.den}"

def parse(s):
    a, b = s.split("/")
    return Fraction(int(a), int(b))

x = parse(input())
y = parse(input())
print(x + y)
print(x - y)
print(x * y)
try:
    print(x / y)
except ZeroDivisionError:
    print("деление на ноль")
print(x == y)
