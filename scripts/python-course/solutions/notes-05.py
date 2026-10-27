import json

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

clients = load("clients.json")
while True:
    parts = input().split()
    if parts[0] == "выход":
        break
    if parts[0] == "добавить":
        if parts[1] in clients:
            print("Уже есть")
        else:
            clients[parts[1]] = {"phone": parts[2], "debt": 0}
    elif parts[0] == "долг":
        if parts[1] in clients:
            clients[parts[1]]["debt"] += int(parts[2])
        else:
            print("Нет клиента")
    elif parts[0] == "должники":
        debtors = sorted((c for c in clients.items() if c[1]["debt"] > 0), key=lambda c: -c[1]["debt"])
        if not debtors:
            print("Должников нет")
        for name, info in debtors:
            print(f"{name}: {info['debt']}")
with open("clients.json", "w", encoding="utf-8") as f:
    json.dump(clients, f, ensure_ascii=False)
print(f"Клиентов: {len(clients)}")
