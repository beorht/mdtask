n = int(input())
total = 0
for _ in range(n):
    s = input()
    try:
        x = int(s)
    except ValueError:
        print(f"Ошибка: '{s}' не является целым числом")
        continue
    if x % 2 == 0:
        total += x
print(total)
