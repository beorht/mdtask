total = {}
for _ in range(2):
    for _ in range(int(input())):
        name, k = input().split()
        total[name] = total.get(name, 0) + int(k)
for name, k in total.items():
    print(f"{name} — {k}")
