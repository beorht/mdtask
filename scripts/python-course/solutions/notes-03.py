import json

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

notes = load("notes.json")
word = input().lower()
found = False
for i, text in enumerate(notes, 1):
    if word in text.lower():
        print(f"{i}. {text}")
        found = True
if not found:
    print("Ничего не найдено")
