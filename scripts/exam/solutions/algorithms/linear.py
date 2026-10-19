# Эталон: линейный поиск (задания 3.1–3.2 итоговой контрольной).
# Режим — аргумент: first (первая запись с таким значением), equal (все такие), greater (все больше заданного).
import sys

mode = sys.argv[1] if len(sys.argv) > 1 else "first"
n = int(input())
records = []
for _ in range(n):
    key, value = input().split()
    records.append((key, value))
query = input()

if mode == "first":
    compared = 0
    position = 0
    for i in range(n):
        compared += 1
        if records[i][1] == query:
            position = i + 1
            break
    if position:
        print(f"Найдено: строка {position}, {records[position - 1][0]}")
        print(f"Сравнений: {compared}")
    else:
        print("Не найдено")
        print(f"Сравнений: {n}")
else:
    found = 0
    for key, value in records:
        ok = int(value) > int(query) if mode == "greater" else value == query
        if ok:
            print(key)
            found += 1
    print(f"Найдено: {found}")
