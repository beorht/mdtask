n = int(input())
scores = {}
for _ in range(n):
    name, s = input().split()
    scores[name] = int(s)
total = 0
best = None
for name, s in scores.items():
    total += s
    if best is None or s > scores[best]:
        best = name
avg = total / n
low = []
for name, s in scores.items():
    if s < avg:
        low.append(name)
print(f"Среднее: {round(avg, 2)}")
print(f"Лучший: {best}")
print("Ниже среднего: " + (", ".join(low) if low else "нет"))
