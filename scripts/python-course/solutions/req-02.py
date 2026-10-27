import requests

while True:
    sid = input()
    if sid == "конец":
        break
    try:
        r = requests.get(f"http://api.edu/students/{sid}", timeout=5)
        r.raise_for_status()
        print(r.json()["name"])
    except requests.exceptions.HTTPError as e:
        print(f"Ошибка {e.response.status_code}: студент {sid}")
