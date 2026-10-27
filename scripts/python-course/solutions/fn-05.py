def receipt(name, price, count):
    print(f"Товар: {name}")
    print(f"Количество: {count}")
    print(f"Сумма: {price * count}")

n = int(input())
for i in range(n):
    name, price, count = input().split()
    if i > 0:
        print("---")
    receipt(name, int(price), int(count))
