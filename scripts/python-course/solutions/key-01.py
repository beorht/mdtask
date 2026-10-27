import requests

key = input()
r = requests.get("http://api.edu/rates", params={"base": "USD"})
print(f"Без ключа: {r.status_code} {r.json()['error']}")
r = requests.get("http://api.edu/rates", params={"base": "USD"}, headers={"X-API-Key": key})
if r.status_code == 200:
    print(f"С ключом: 1 USD = {r.json()['rates']['UZS']} UZS")
else:
    print(f"С ключом: {r.status_code}")
