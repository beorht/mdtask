import json

n = int(input())
data = {}
for _ in range(n):
    key, value = input().split()
    data[key] = int(value) if value.lstrip("-").isdigit() else value
with open("profile.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
with open("profile.json", encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, sort_keys=True))
