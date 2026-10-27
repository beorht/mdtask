import requests

while True:
    city = input()
    if city == "конец":
        break
    r = requests.get("http://api.edu/weather?city=" + city)
    if r.status_code == 404:
        print(f"{city}: нет данных")
    else:
        w = r.json()
        print(f"{city}: {w['temp']}°, {w['condition']}")
