n = int(input())
groups = {}
for _ in range(n):
    name, group, score = input().split()
    groups.setdefault(group, []).append((name, int(score)))
for group, people in groups.items():
    print(f"Группа {group}: " + ", ".join(f"{name} ({s})" for name, s in people))
    total = 0
    best = people[0]
    for person in people:
        total += person[1]
        if person[1] > best[1]:
            best = person
    print(f"Среднее: {round(total / len(people), 1)}")
    print(f"Лучший: {best[0]}")
