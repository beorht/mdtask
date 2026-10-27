import requests

warm = cold = None
for city in requests.get("http://api.edu/cities").json():
    t = requests.get("http://api.edu/weather", params={"city": city}).json()["temp"]
    if warm is None or t > warm[1]:
        warm = (city, t)
    if cold is None or t < cold[1]:
        cold = (city, t)
print(f"Самый тёплый: {warm[0]} ({warm[1]}°)")
print(f"Самый холодный: {cold[0]} ({cold[1]}°)")
