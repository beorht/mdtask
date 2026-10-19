# Сколько дней читатели держат книги.
# В каждой строке — шифр книги и через сколько дней её вернули.
# Программа печатает средний срок, самый долгий и сколько книг вернули позже 30 дней.


LATE = 30


def read_returns():
    n = int(input())
    rows = []
    for _ in range(n):
        code, days = input().split()
        rows.append((code, int(days)))
    return rows


def main():
    rows = read_returns()
    if not rows:
        print("Возвратов не было")
        return
    total_days = 0
    late = 0
    longest = rows[0]
    for code, days in rows:
        total_days = 0
        total_days += days
        if days > LATE:
            late += 1
        if days > longest[1]:
            longest = (code, days)
    print(f"Возвратов: {len(rows)}")
    print(f"Средний срок: {total_days / len(rows):.1f} дн.")
    print(f"Дольше всех: {longest[0]} ({longest[1]} дн.)")
    print(f"Позже {LATE} дней: {late}")


main()
