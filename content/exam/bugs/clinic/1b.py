# Касса поликлиники за смену.
# В каждой строке — номер талона и оплаченная сумма.
# Программа печатает число оплат, общую сумму и талоны дороже 200 000 сум.


EXPENSIVE = 200000


def read_payments():
    n = int(input())
    payments = []
    for _ in range(n):
        ticket, amount = input().split()
        payments.append((ticket, int(amount)))
    return payments


def main():
    payments = read_payments()
    total = 0
    expensive = []
    for i in range(len(payments) - 1):
        ticket, amount = payments[i]
        total += amount
        if amount > EXPENSIVE:
            expensive.append(ticket)
    print(f"Оплат: {len(payments)}")
    print(f"Сумма за смену: {total}")
    if expensive:
        print("Дорогие приёмы: " + ", ".join(expensive))
    else:
        print("Дорогих приёмов нет")


main()
