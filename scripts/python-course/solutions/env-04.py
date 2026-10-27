with open(".gitignore", encoding="utf-8") as f:
    ignored = [line.strip() for line in f]
print(f".env в .gitignore: {'да' if '.env' in ignored else 'нет'}")
bad = []
with open(".env.example", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, _, value = line.partition("=")
            if value.strip():
                bad.append(name.strip())
for name in bad:
    print(f"Убрать значение: {name}")
if not bad:
    print("Пример без секретов")
