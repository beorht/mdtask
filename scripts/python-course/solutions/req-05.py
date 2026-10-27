import requests

want = input()
found = []
for city in requests.get("http://api.edu/cities").json():
    w = requests.get("http://api.edu/weather", params={"city": city}).json()
    if w["condition"] == want:
        found.append(w)
if not found:
    print("Таких городов нет")
else:
    for w in found:
        print(f"{w['city']}: {w['temp']}°, влажность {w['humidity']} %")
    print(f"Средняя температура: {round(sum(w['temp'] for w in found) / len(found), 1)}")
