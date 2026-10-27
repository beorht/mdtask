h = int(input())
if h < 0 or h > 23:
    print("Ошибка")
elif h <= 5:
    print("Ночь")
elif h <= 11:
    print("Утро")
elif h <= 17:
    print("День")
else:
    print("Вечер")
