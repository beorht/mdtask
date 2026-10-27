import json

with open("transactions.json", encoding="utf-8") as f:
    items = json.load(f)
totals = {}
for t in items:
    totals[t["category"]] = totals.get(t["category"], 0) + t["amount"]
for cat, s in sorted(totals.items(), key=lambda p: (-p[1], p[0])):
    print(f"{cat}: {s}")
print(f"Итого: {sum(totals.values())}")
