a = float(input())
op = input()
b = float(input())
if op == "+":
    print(round(a + b, 2))
elif op == "-":
    print(round(a - b, 2))
elif op == "*":
    print(round(a * b, 2))
elif op == "/":
    if b == 0:
        print("Ошибка: деление на ноль")
    else:
        print(round(a / b, 2))
else:
    print("Неизвестная операция")
