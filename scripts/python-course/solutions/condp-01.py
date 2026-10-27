s = int(input())
if s >= 5000:
    p = 10
elif s >= 2000:
    p = 5
else:
    p = 0
print(f"Скидка: {p}%")
print(f"К оплате: {round(s * (100 - p) / 100, 2)}")
