import json

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

notes = load("notes.json")
while True:
    cmd, _, arg = input().partition(" ")
    if cmd == "выход":
        break
    try:
        n = int(arg)
    except ValueError:
        print("Номер должен быть числом")
        continue
    if 1 <= n <= len(notes):
        print(f"Удалено: {notes.pop(n - 1)}")
    else:
        print(f"Нет заметки {n}")
save("notes.json", notes)
for i, text in enumerate(notes, 1):
    print(f"{i}. {text}")
