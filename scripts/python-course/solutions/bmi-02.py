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

v = bmi(float(input()), float(input()))
print(f"ИМТ: {round(v, 1)}")
print(category(v))
