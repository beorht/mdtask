import os
import requests
from dotenv import load_dotenv

load_dotenv()
default = os.getenv("DEFAULT_CITY", "Ташкент")
cache = {}
hits = 0
while True:
    city = input()
    if city == "конец":
        break
    city = city or default
    if city in cache:
        hits += 1
    else:
        r = requests.get("http://api.edu/weather", params={"city": city})
        cache[city] = r.json() if r.ok else None
    w = cache[city]
    print(f"{city}: {w['temp']}°" if w else f"{city}: нет данных")
print(f"Запросов: {len(cache)}, из кэша: {hits}")
best = None
for w in cache.values():
    if w and (best is None or w["temp"] > best["temp"]):
        best = w
if best:
    print(f"Теплее всего: {best['city']} ({best['temp']}°)")
