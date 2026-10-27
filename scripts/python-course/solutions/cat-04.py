n = int(input())
catalog = []
for _ in range(n):
    name, cat, price = input().split()
    catalog.append({"name": name, "category": cat, "price": int(price)})
hi = catalog[0]
lo = catalog[0]
for item in catalog:
    if item["price"] > hi["price"]:
        hi = item
    if item["price"] < lo["price"]:
        lo = item
print(f"Дороже всего: {hi['name']} ({hi['price']})")
print(f"Дешевле всего: {lo['name']} ({lo['price']})")
