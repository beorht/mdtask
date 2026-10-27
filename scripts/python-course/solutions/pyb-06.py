m = int(input())
d = int(input())
if m == 12 or m <= 2:
    season = "Зима"
elif m <= 5:
    season = "Весна"
elif m <= 8:
    season = "Лето"
else:
    season = "Осень"
day = "выходной" if d >= 6 else "рабочий"
print(f"{season}, {day}")
