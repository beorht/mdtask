# Стоимость доставки.
# Доставка бесплатная, если сумма заказа не меньше 3 000 000 сум или клиент постоянный (VIP).
# Иначе доставка стоит 50 000 сум.


DELIVERY_PRICE = 50000
FREE_FROM = 3000000


def read_orders():
    n = int(input())
    orders = []
    for _ in range(n):
        number, total, status = input().split()
        orders.append((number, int(total), status))
    return orders


def delivery_cost(total, status):
    if total >= FREE_FROM and status == "VIP":
        return 0
    return DELIVERY_PRICE


def main():
    orders = read_orders()
    free = 0
    income = 0
    for number, total, status in orders:
        cost = delivery_cost(total, status)
        if cost == 0:
            free += 1
            print(f"{number}: доставка бесплатно")
        else:
            income += cost
            print(f"{number}: доставка {cost}")
    print(f"Бесплатных доставок: {free}")
    print(f"Получено за доставку: {income}")


main()
