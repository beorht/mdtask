n = int(input())
qty = {}
price = {}
for _ in range(n):
    name, k, p = input().split()
    qty[name] = qty.get(name, 0) + int(k)
    price[name] = int(p)
total = 0
pieces = 0
for name, k in qty.items():
    line = k * price[name]
    total += line
    pieces += k
    print(f"{name} {k} шт × {price[name]} = {line}")
print(f"ИТОГО: {total}")
print(f"Позиций: {len(qty)}")
print(f"Штук: {pieces}")
