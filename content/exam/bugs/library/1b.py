# Штрафы за просрочку.
# В каждой строке — билет читателя и число дней просрочки. За каждый день — 500 сум.
# Программа печатает штраф каждого читателя и общую сумму.


FINE_PER_DAY = 500


def read_overdue():
    n = int(input())
    rows = []
    for _ in range(n):
        card, days = input().split()
        rows.append((card, int(days)))
    return rows


def main():
    rows = read_overdue()
    total = 0
    count = 0
    for i in range(len(rows) - 1):
        card, days = rows[i]
        fine = days * FINE_PER_DAY
        total += fine
        count += 1
        print(f"{card}: {days} дн. — {fine}")
    print(f"Читателей с просрочкой: {count}")
    print(f"Всего штрафов: {total}")
    if count > 0:
        print(f"Средний штраф: {total // count}")


main()
