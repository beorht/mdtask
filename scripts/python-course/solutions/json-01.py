import json

try:
    data = json.loads(input())
except json.JSONDecodeError:
    print("Ошибка JSON")
else:
    print(f"Имя: {data['name']}")
    print(f"Возраст: {data['age']}")
    print(f"Языки: {', '.join(data['langs'])}")
