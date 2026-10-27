n = int(input())
groups = {}
sums = {}
for _ in range(n):
    name, cat, price = input().split()
    groups.setdefault(cat, []).append(name)
    sums[cat] = sums.get(cat, 0) + int(price)
for cat, names in groups.items():
    print(f"{cat}: {', '.join(names)} — сумма {sums[cat]}")
