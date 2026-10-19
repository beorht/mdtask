# Чек покупки: по каждой строке — товар, цена и количество.
# Программа печатает строки чека и итоговую сумму.


def read_items():
    n = int(input())
    items = []
    for _ in range(n):
        name, price, qty = input().split()
        items.append((name, int(price), int(qty)))
    return items


def line_total(item):
    name, price, qty = item
    return price * qty


def print_receipt(items):
    total = 0
    for i in range(1, len(items)):
        name, price, qty = items[i]
        cost = line_total(items[i])
        total += cost
        print(f"{i + 1}. {name}: {qty} x {price} = {cost}")
    print("-" * 20)
    print(f"Итого: {total}")
    return total


def main():
    items = read_items()
    if not items:
        print("Чек пуст")
        return
    total = print_receipt(items)
    if total >= 1000000:
        print("Покупка крупная: положен подарок")


main()
