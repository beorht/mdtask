# Самый дорогой и самый дешёвый товар в каталоге.
# В каждой строке — артикул и цена.


def read_products():
    n = int(input())
    products = []
    for _ in range(n):
        parts = input().split()
        code = parts[0]
        price = int(parts[1])
        products.append((code, price))
    return products


def most_expensive(products):
    best = products[0]
    for product in products:
        if product[1] > best[1]:
            best = product
    return best


def cheapest(products):
    best = products[0]
    for product in products:
        if product[1] < best[1]:
            best = product
    return best


def main():
    products = read_products()
    if not products:
        print("Каталог пуст")
        return
    top = most_expensive(products)
    low = cheapest(products)
    print(f"Самый дорогой: {top[0]} ({top[1]})")
    print(f"Самый дешёвый: {low[0]} ({low[1]})")
    print(f"Разница в цене: {int(top[1]) - int(low[1])}")


main()
