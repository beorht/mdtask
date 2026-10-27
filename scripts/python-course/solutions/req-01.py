import requests

while True:
    city = input()
    if city == "конец":
        break
    r = requests.get("http://api.edu/weather", params={"city": city}, timeout=5)
    print(f"{city}: {r.json()['humidity']} %" if r.ok else f"{city}: —")
