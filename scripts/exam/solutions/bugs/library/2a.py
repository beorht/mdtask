# Должники библиотеки.
# В каждой строке — билет читателя, шифр книги и сколько дней книга просрочена.
# Читатель считается должником, если просрочка 14 дней и больше.
# Программа печатает должников и сколько книг они не вернули.


DEBT_DAYS = 14


def read_rows():
    n = int(input())
    rows = []
    for _ in range(n):
        card, code, days = input().split()
        rows.append((card, code, int(days)))
    return rows


def debtors(rows):
    result = {}
    order = []
    for card, code, days in rows:
        if days >= DEBT_DAYS:
            if card not in result:
                result[card] = 0
                order.append(card)
            result[card] += 1
    return result, order


def main():
    rows = read_rows()
    result, order = debtors(rows)
    if not order:
        print("Должников нет")
        return
    for card in order:
        print(f"{card}: не вернул книг — {result[card]}")
    print(f"Всего должников: {len(order)}")


main()
