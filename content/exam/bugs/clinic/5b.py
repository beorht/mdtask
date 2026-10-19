# Рейтинг врачей по числу приёмов.
# В каждой строке — логин врача (один приём).
# Программа печатает врачей по убыванию числа приёмов
# (при равенстве — по алфавиту) и долю каждого в процентах.


def read_doctors():
    n = int(input())
    names = []
    for _ in range(n):
        names.append(input().strip())
    return names


def count(names):
    result = {}
    for name in names:
        result[name] = result.get(name, 0) + 1
    return result


def ranking(counts):
    items = list(counts.items())
    items.sort(key=lambda item: (item[1], item[0]))
    return items


def main():
    names = read_doctors()
    counts = count(names)
    total = len(names)
    for place, (name, visits) in enumerate(ranking(counts), start=1):
        share = visits * 100 // total
        print(f"{place}. {name}: {visits} ({share}%)")


main()
