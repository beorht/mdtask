import os
import requests
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("API_KEY")
if not key:
    print("Нет ключа в .env")
else:
    r = requests.get("http://api.edu/rates", params={"base": "USD"}, headers={"X-API-Key": key})
    print(f"1 USD = {r.json()['rates']['UZS']} UZS" if r.status_code == 200 else "Ключ не подошёл")
