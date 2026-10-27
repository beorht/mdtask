import os
import requests
from dotenv import load_dotenv

load_dotenv()
headers = {"X-API-Key": os.getenv("API_KEY", "")}
cache = {}
while True:
    line = input()
    if line == "конец":
        break
    amount, src, dst = line.split()
    if src not in cache:
        r = requests.get("http://api.edu/rates", params={"base": src}, headers=headers)
        cache[src] = r.json()["rates"] if r.ok else {}
    rates = cache[src]
    if dst in rates:
        print(f"{amount} {src} = {round(float(amount) * rates[dst], 2)} {dst}")
    else:
        print(f"Нет курса {src} -> {dst}")
print(f"Запросов к API: {len(cache)}")
