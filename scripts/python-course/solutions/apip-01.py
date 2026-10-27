import requests

found = []
missing = []
for city in input().split(", "):
    r = requests.get("http://api.edu/weather", params={"city": city}, timeout=5)
    if r.ok:
        found.append(r.json())
    else:
        missing.append(city)
for w in found:
    print(f"{w['city']} | {w['temp']}° | {w['condition']}")
if missing:
    print(f"Не найдены: {', '.join(missing)}")
print(f"Средняя температура: {round(sum(w['temp'] for w in found) / len(found), 1)}")
