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

ORDER = ["Недостаток веса", "Норма", "Избыточный вес", "Ожирение"]
groups = {c: [] for c in ORDER}
n = int(input())
for _ in range(n):
    name, w, h = input().split()
    groups[category(bmi(float(w), float(h)))].append(name)
for c in ORDER:
    print(f"{c}: {', '.join(groups[c]) if groups[c] else '—'}")
