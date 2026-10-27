import requests

while True:
    url = input()
    if url == "конец":
        break
    try:
        print(f"{url}: {requests.get(url, timeout=5).status_code}")
    except requests.exceptions.ConnectionError:
        print(f"{url}: нет связи")
