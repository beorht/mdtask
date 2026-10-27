import requests

while True:
    text = input()
    if text == "конец":
        break
    r = requests.post("http://api.edu/notes", json={"text": text})
    if r.status_code == 201:
        print(f"{r.status_code}: {r.json()['id']}")
    else:
        print(f"{r.status_code}: ошибка")
print(f"Сохранено: {len(requests.get('http://api.edu/notes').json())}")
