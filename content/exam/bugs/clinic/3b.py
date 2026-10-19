# Пациенты старшего возраста.
# В каждой строке — номер карты и возраст пациента. Последняя строка — возраст N.
# Программа печатает карты пациентов старше N лет и их средний возраст.


def read_patients():
    n = int(input())
    patients = []
    for _ in range(n):
        card, age = input().split()
        patients.append((card, age))
    return patients


def older_than(patients, limit):
    result = []
    for card, age in patients:
        if age > limit:
            result.append((card, age))
    return result


def main():
    patients = read_patients()
    limit = input()
    result = older_than(patients, limit)
    print(f"Старше {limit} лет: {len(result)}")
    total = 0
    for card, age in result:
        print(f"{card}: {age}")
        total += int(age)
    if result:
        print(f"Средний возраст: {total / len(result):.1f}")


main()
