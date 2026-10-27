n = int(input())
items = {}
for _ in range(n):
    name, cat, price = input().split()
    items[name] = (cat, int(price))
while True:
    parts = input().split()
    cmd = parts[0]
    if cmd == "стоп":
        break
    if cmd == "добавить":
        items[parts[1]] = (parts[2], int(parts[3]))
        print("Добавлено")
    elif cmd == "удалить":
        if parts[1] in items:
            del items[parts[1]]
            print("Удалено")
        else:
            print("Нет такого товара")
    elif cmd == "цена":
        if parts[1] in items:
            print(items[parts[1]][1])
        else:
            print("Нет такого товара")
    elif cmd == "итого":
        total = 0
        for cat, price in items.values():
            total += price
        print(f"Товаров: {len(items)}, на сумму {total}")
    else:
        print("Неизвестная команда")
