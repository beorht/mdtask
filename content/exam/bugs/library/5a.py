# Какие книги брал каждый читатель.
# В каждой строке — билет читателя и шифр книги.
# Читатели печатаются в порядке первой выдачи.


def read_loans():
    n = int(input())
    loans = []
    for _ in range(n):
        card, code = input().split()
        loans.append((card, code))
    return loans


def books_by_reader(loans):
    result = {}
    for card, code in loans:
        result[card] = []
        result[card].append(code)
    return result


def main():
    loans = read_loans()
    result = books_by_reader(loans)
    for card in result:
        books = ", ".join(result[card])
        print(f"{card} ({len(result[card])}): {books}")
    most = ""
    for card in result:
        if most == "" or len(result[card]) > len(result[most]):
            most = card
    print(f"Больше всех книг взял: {most}")


main()
