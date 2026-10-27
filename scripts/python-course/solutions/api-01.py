import requests

r = requests.get("http://api.edu/cities")
print(r.status_code)
cities = r.json()
print(f"Городов: {len(cities)}")
print(", ".join(cities))
