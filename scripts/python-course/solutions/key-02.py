import requests

key = input()
while True:
    line = input()
    if line == "конец":
        break
    amount, src, dst = line.split()
    r = requests.get("http://api.edu/rates", params={"base": src}, headers={"X-API-Key": key})
    rates = r.json().get("rates", {}) if r.ok else {}
    if dst in rates:
        print(f"{amount} {src} = {round(float(amount) * rates[dst], 2)} {dst}")
    else:
        print(f"Нет курса {src} -> {dst}")
