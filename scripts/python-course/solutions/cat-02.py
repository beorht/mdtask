n = int(input())
catalog = []
for _ in range(n):
    name, cat, price = input().split()
    catalog.append({"name": name, "category": cat, "price": int(price)})
q = input().lower()
found = False
for item in catalog:
    if q in item["name"].lower():
        print(f"{item['name']} — {item['price']}")
        found = True
if not found:
    print("Ничего не найдено")
