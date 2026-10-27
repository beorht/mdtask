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
    line = input()
    if line == "выход":
        break
    notes.append(line)
save("notes.json", notes)
with open("notes.json", encoding="utf-8") as f:
    print(f.read())
