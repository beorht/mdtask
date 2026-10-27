import requests

key = input()
base = input()
r = requests.get("http://api.edu/rates", params={"base": base}, headers={"X-API-Key": key})
if not r.ok:
    print(f"Ошибка: {r.status_code}")
else:
    rates = r.json()["rates"]
    for code in sorted(rates):
        print(f"1 {base} = {rates[code]:.2f} {code}")
