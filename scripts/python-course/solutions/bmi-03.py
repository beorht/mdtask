def bmi(weight, height_cm):
    return weight / (height_cm / 100) ** 2

def category(value):
    if value < 18.5:
        return "Недостаток веса"
    if value < 25:
        return "Норма"
    if value < 30:
        return "Избыточный вес"
    return "Ожирение"

try:
    w = float(input())
    h = float(input())
except ValueError:
    print("Ошибка: введите числа")
else:
    if not (20 <= w <= 300) or not (50 <= h <= 250):
        print("Ошибка: нереальные данные")
    else:
        v = bmi(w, h)
        print(f"ИМТ: {round(v, 1)}")
        print(category(v))
