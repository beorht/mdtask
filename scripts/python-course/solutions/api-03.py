import requests

while True:
    path = input()
    if path == "конец":
        break
    print(f"{path} -> {requests.get('http://api.edu' + path).status_code}")
