# Самый ранний и самый поздний приём дня.
# В каждой строке — номер талона, часы и минуты приёма через пробел (например: T-15 9 30).


def read_visits():
    n = int(input())
    visits = []
    for _ in range(n):
        ticket, hours, minutes = input().split()
        visits.append((ticket, hours * 60 + minutes))
    return visits


def fmt(total):
    return f"{total // 60:02d}:{total % 60:02d}"


def earliest(visits):
    best = visits[0]
    for visit in visits:
        if visit[1] < best[1]:
            best = visit
    return best


def latest(visits):
    best = visits[0]
    for visit in visits:
        if visit[1] > best[1]:
            best = visit
    return best


def main():
    visits = read_visits()
    first = earliest(visits)
    last = latest(visits)
    print(f"Первый приём: {first[0]} в {fmt(first[1])}")
    print(f"Последний приём: {last[0]} в {fmt(last[1])}")
    print(f"Рабочий день врача: {fmt(last[1] - first[1])}")


main()
