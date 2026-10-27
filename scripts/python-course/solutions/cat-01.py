n = int(input())
catalog = []
for _ in range(n):
    name, cat, price = input().split()
    catalog.append({"name": name, "category": cat, "price": int(price)})
total = 0
for item in catalog:
    total += item["price"]
print(f"Товаров: {len(catalog)}")
print(f"Сумма цен: {total}")
