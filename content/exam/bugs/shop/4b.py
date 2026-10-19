# Проверка наличия товаров.
# Сначала — список товаров на складе (артикул и количество), потом — артикулы из заказа.
# Для каждого артикула заказа программа печатает, есть ли товар на складе.


def read_stock():
    n = int(input())
    stock = []
    for _ in range(n):
        code, qty = input().split()
        stock.append((code, int(qty)))
    return stock


def find_qty(stock, code):
    for item_code, qty in stock:
        if item_code == code:
            return qty
        return 0


def main():
    stock = read_stock()
    m = int(input())
    missing = 0
    for _ in range(m):
        code = input()
        qty = find_qty(stock, code)
        if qty > 0:
            print(f"{code}: есть, {qty} шт.")
        else:
            print(f"{code}: нет в наличии")
            missing += 1
    if missing == 0:
        print("Заказ можно собрать полностью")
    else:
        print(f"Не хватает позиций: {missing}")


main()
