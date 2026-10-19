# Скидка на заказ.
# Правила магазина: от 5 000 000 сум — скидка 10%, от 2 000 000 сум — 5%, меньше — без скидки.
# Для каждого заказа программа печатает сумму, скидку и сумму к оплате.


def discount_percent(total):
    if total >= 5000000:
        return 10
    if total >= 2000000:
        return 5
    return 0


def read_orders():
    n = int(input())
    orders = []
    for _ in range(n):
        number, total = input().split()
        orders.append((number, int(total)))
    return orders


def main():
    orders = read_orders()
    paid = 0
    for number, total in orders:
        percent = discount_percent(total)
        discount = total * percent // 100
        to_pay = total - discount
        paid += to_pay
        print(f"{number}: {total} - {percent}% = {to_pay}")
    print(f"Всего к оплате: {paid}")


main()
