import requests

key = input()
h = {"X-API-Key": key}
usd = float(input().split()[0])
eur = float(input().split()[0])
u = round(usd * requests.get("http://api.edu/rates", params={"base": "USD"}, headers=h).json()["rates"]["UZS"])
e = round(eur * requests.get("http://api.edu/rates", params={"base": "EUR"}, headers=h).json()["rates"]["UZS"])
print(f"USD: {u} UZS")
print(f"EUR: {e} UZS")
print("Больше USD" if u > e else "Больше EUR" if e > u else "Поровну")
