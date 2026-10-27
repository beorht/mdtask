import os
import requests
from dotenv import load_dotenv

load_dotenv()
default = os.getenv("DEFAULT_CITY", "Ташкент")
while True:
    city = input()
    if city == "конец":
        break
    city = city or default
    r = requests.get("http://api.edu/weather", params={"city": city})
    print(f"{city}: {r.json()['temp']}°" if r.ok else f"{city}: нет данных")
