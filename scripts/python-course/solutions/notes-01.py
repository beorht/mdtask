import json

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

notes = load("notes.json")
if not notes:
    print("Заметок нет")
for i, text in enumerate(notes, 1):
    print(f"{i}. {text}")
