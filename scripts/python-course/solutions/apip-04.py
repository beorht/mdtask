import requests

URL = "http://api.edu/notes"
while True:
    cmd, _, text = input().partition(" ")
    if cmd == "конец":
        break
    if cmd == "add":
        r = requests.post(URL, json={"text": text})
        print(f"Заметка #{r.json()['id']}" if r.status_code == 201 else "Пустая заметка не сохранена")
    elif cmd == "list":
        notes = requests.get(URL).json()
        if not notes:
            print("Заметок нет")
        for n in notes:
            print(f"#{n['id']} {n['text']}")
    elif cmd == "count":
        print(len(requests.get(URL).json()))
