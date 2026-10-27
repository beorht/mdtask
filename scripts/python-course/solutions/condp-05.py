a = int(input())
b = int(input())
c = int(input())
d = b * b - 4 * a * c
if d > 0:
    x1 = (-b - d ** 0.5) / (2 * a)
    x2 = (-b + d ** 0.5) / (2 * a)
    if x1 > x2:
        x1, x2 = x2, x1
    print(round(x1, 2), round(x2, 2))
elif d == 0:
    print(round(-b / (2 * a), 2))
else:
    print("Нет корней")
