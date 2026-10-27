n = int(input())
total = 0
best = None
best_value = 0
for _ in range(n):
    name, k, price = input().split()
    value = int(k) * int(price)
    total += value
    if best is None or value > best_value:
        best = name
        best_value = value
print(total)
print(best)
