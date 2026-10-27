n = int(input())
catalog = []
for _ in range(n):
    name, cat, price = input().split()
    catalog.append({"name": name, "category": cat, "price": int(price)})
count = {}
total = {}
for item in catalog:
    c = item["category"]
    count[c] = count.get(c, 0) + 1
    total[c] = total.get(c, 0) + item["price"]
for c in sorted(count):
    print(f"{c}: {count[c]} шт., {total[c]}")
