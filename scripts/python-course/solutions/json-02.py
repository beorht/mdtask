import json

with open("products.json", encoding="utf-8") as f:
    items = json.load(f)
ok = [p for p in items if p["in_stock"]]
print(", ".join(p["name"] for p in ok))
print(f"Стоимость запаса: {sum(p['price'] * p['count'] for p in ok)}")
