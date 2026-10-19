# Выручка магазина за несколько дней.
# Для каждого дня программа печатает выручку и накопленный итог,
# в конце — общую выручку и лучший день.


def read_days():
    n = int(input())
    days = []
    for _ in range(n):
        day, income = input().split()
        days.append((day, int(income)))
    return days


def main():
    days = read_days()
    if not days:
        print("Нет данных")
        return
    total = 0
    best_day = days[0][0]
    best_income = days[0][1]
    for day, income in days:
        total = 0
        total += income
        print(f"{day}: {income}, с начала периода {total}")
        if income > best_income:
            best_day = day
            best_income = income
    print(f"Выручка за период: {total}")
    print(f"Лучший день: {best_day} ({best_income})")


main()
