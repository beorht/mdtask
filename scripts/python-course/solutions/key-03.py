import requests

while True:
    key = input()
    if key == "конец":
        break
    r = requests.get("http://api.edu/rates", headers={"X-API-Key": key})
    print(f"{key[:3]}***: {'принят' if r.status_code == 200 else 'отклонён'}")
