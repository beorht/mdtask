n = int(input())
catalog = []
for _ in range(n):
    name, cat, price = input().split()
    catalog.append({"name": name, "category": cat, "price": int(price)})
cat = input()
limit = int(input())
names = []
for item in catalog:
    if item["category"] == cat and item["price"] <= limit:
        names.append(item["name"])
print(", ".join(names) if names else "Нет подходящих")
