def bmi(weight, height_cm):
    return weight / (height_cm / 100) ** 2

print(round(bmi(float(input()), float(input())), 1))
