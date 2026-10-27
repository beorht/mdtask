p = int(input())
if p < 0 or p > 100:
    print("Ошибка")
elif p >= 90:
    print(5)
elif p >= 75:
    print(4)
elif p >= 50:
    print(3)
else:
    print(2)
