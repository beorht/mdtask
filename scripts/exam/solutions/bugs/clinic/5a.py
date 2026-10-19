# Сколько пациентов принял каждый врач и на какую сумму.
# В каждой строке — логин врача и стоимость приёма.
# Врачи печатаются по алфавиту.


def read_visits():
    n = int(input())
    visits = []
    for _ in range(n):
        doctor, price = input().split()
        visits.append((doctor, int(price)))
    return visits


def by_doctor(visits):
    stats = {}
    for doctor, price in visits:
        if doctor not in stats:
            stats[doctor] = [0, 0]
        stats[doctor][0] += 1
        stats[doctor][1] += price
    return stats


def main():
    visits = read_visits()
    stats = by_doctor(visits)
    total = 0
    for doctor in sorted(stats):
        count, money = stats[doctor]
        total += money
        print(f"{doctor}: пациентов {count}, сумма {money}")
    print(f"Итого по поликлинике: {total}")


main()
