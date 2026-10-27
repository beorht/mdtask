try:
    a = float(input())
    b = float(input())
    print(round(a / b, 2))
except ValueError:
    print("Ошибка ввода")
except ZeroDivisionError:
    print("Деление на ноль")
