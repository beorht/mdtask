def read_stock():
    n = int(input())
    stock = []
    for _ in range(n):
        code, left, minimum = input().split()
        stock.append((code, int(left), int(minimum)))
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
    print(f"Всего единиц к заказу: {total}")

if __name__ == '__main__':
    main()