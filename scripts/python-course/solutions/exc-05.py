try:
    price = int(input())
    p = int(input())
except ValueError:
    print("Ошибка ввода")
else:
    if p < 0 or p > 100:
        print("Неверная скидка")
    else:
        print(round(price * (100 - p) / 100, 2))
