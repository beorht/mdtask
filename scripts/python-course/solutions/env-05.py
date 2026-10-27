from dotenv import dotenv_values

need = input().split()
values = dotenv_values(".env")
missing = [n for n in need if not values.get(n)]
print(f"Не заданы: {', '.join(missing)}" if missing else "Конфигурация в порядке")
print(f"Настроек в .env: {len(values)}")
