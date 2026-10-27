import requests

groups = {}
sid = 1
while True:
    r = requests.get(f"http://api.edu/students/{sid}")
    if r.status_code == 404:
        break
    s = r.json()
    groups.setdefault(s["group"], []).append(s)
    sid += 1
for g in sorted(groups):
    names = ", ".join(s["name"] for s in groups[g])
    grades = [x for s in groups[g] for x in s["grades"]]
    print(f"{g}: {names}; средний балл {round(sum(grades) / len(grades), 2)}")
print(f"Всего студентов: {sid - 1}")
