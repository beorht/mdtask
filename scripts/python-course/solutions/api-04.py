import requests

for sid in input().split():
    r = requests.get(f"http://api.edu/students/{sid}")
    if r.status_code == 200:
        s = r.json()
        print(f"{sid}. {s['name']} ({s['group']}): {round(sum(s['grades']) / len(s['grades']), 2)}")
    else:
        print(f"{sid}: не найден")
