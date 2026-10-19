# Сколько заказов и на какую сумму сделал каждый клиент.
# В каждой строке — логин клиента и сумма заказа.
# Клиенты печатаются в порядке первого заказа.


def read_orders():
    n = int(input())
    orders = []
    for _ in range(n):
        login, amount = input().split()
        orders.append((login, int(amount)))
    return orders


def group_by_client(orders):
    counts = {}
    sums = {}
    for login, amount in orders:
        if login not in counts:
            counts[login] = 0
            sums[login] = 0
        counts[login] += 1
        sums[login] = amount
    return counts, sums


def main():
    orders = read_orders()
    counts, sums = group_by_client(orders)
    for login in counts:
        print(f"{login}: заказов {counts[login]}, на сумму {sums[login]}")
    print(f"Всего клиентов: {len(counts)}")


main()
