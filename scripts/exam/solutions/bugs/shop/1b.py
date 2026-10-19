# Отчёт за день: суммы заказов по порядку.
# Программа печатает число заказов, общую и среднюю сумму, самый крупный заказ.


def read_amounts():
    n = int(input())
    amounts = []
    for _ in range(n):
        amounts.append(int(input()))
    return amounts


def summary(amounts):
    total = 0
    biggest = amounts[0]
    for i in range(len(amounts)):
        total += amounts[i]
        if amounts[i] > biggest:
            biggest = amounts[i]
    return total, biggest


def main():
    amounts = read_amounts()
    if len(amounts) == 0:
        print("Заказов нет")
        return
    total, biggest = summary(amounts)
    average = total // len(amounts)
    print(f"Заказов: {len(amounts)}")
    print(f"Сумма: {total}")
    print(f"Средний чек: {average}")
    print(f"Самый крупный заказ: {biggest}")


main()
