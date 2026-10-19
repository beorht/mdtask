# Нагрузка врачей за неделю.
# В каждой строке — логин врача и число приёмов за день. Строки одного врача идут подряд.
# Программа печатает для каждого врача сумму за неделю и среднее в день.


def read_rows():
    n = int(input())
    rows = []
    for _ in range(n):
        doctor, visits = input().split()
        rows.append((doctor, int(visits)))
    return rows


def weekly(rows):
    result = []
    current = None
    total = 0
    days = 0
    for doctor, visits in rows:
        if doctor != current:
            if current is not None:
                result.append((current, total, days))
            current = doctor
            total = 0
            days = 0
        total += visits
        days += 1
    if current is not None:
        result.append((current, total, days))
    return result


def main():
    rows = read_rows()
    for doctor, total, days in weekly(rows):
        print(f"{doctor}: {total} приёмов, в среднем {total / days:.1f} в день")


main()
