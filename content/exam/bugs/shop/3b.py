# Остатки на складе.
# Для каждого товара известны остаток и минимальный запас.
# Программа печатает товары, у которых остаток меньше минимального запаса, и сколько их дозаказать.


def read_stock():
    n = int(input())
    stock = []
    for _ in range(n):
        code, left, minimum = input().split()
        stock.append((code, left, minimum))
    return stock


def to_order(stock):
    result = []
    for code, left, minimum in stock:
        if left < minimum:
            result.append((code, minimum - left))
    return result


def main():
    stock = read_stock()
    orders = to_order(stock)
    if not orders:
        print("Дозаказ не нужен")
        return
    total = 0
    for code, amount in orders:
        print(f"{code}: дозаказать {amount}")
        total += amount
    print(f"Всего единиц к дозаказу: {total}")


main()
