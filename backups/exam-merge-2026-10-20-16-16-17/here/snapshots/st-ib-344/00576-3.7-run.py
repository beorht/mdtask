# Самые продаваемые товары.
# В каждой строке — артикул и сколько штук продано в одном заказе.
# Программа печатает три товара с наибольшими продажами (при равенстве — по артикулу).


def read_sales():
    n = int(input())
    sales = []
    for _ in range(n):
        code, qty = input().split()
        sales.append((code, int(qty)))
    return sales


def totals(sales):
    result = {}
    for code, qty in sales:
        result[code] = result.get(code, 0) + qty
    return result


def top(result, k):
    items = list(result.items())
    items.sort(key=lambda item: (item[0], -item[1]))
    return items[:k]


def main():
    sales = read_sales()
    result = totals(sales)
    print(f"Разных товаров: {len(result)}")
    for place, (code, qty) in enumerate(top(result, 3), start=1):
        print(f"{place}. {code} — {qty} шт.")


main()
