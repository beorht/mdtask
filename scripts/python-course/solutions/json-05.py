import json

with open("settings.json", encoding="utf-8") as f:
    data = json.load(f)
n = int(input())
for _ in range(n):
    cur = data
    found = True
    for key in input().split("."):
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            found = False
            break
    if not found:
        print("Нет")
    elif isinstance(cur, (dict, list)):
        print(json.dumps(cur, ensure_ascii=False))
    else:
        print(cur)
