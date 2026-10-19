# Выдача книг.
# Для каждого запроса — билет, число книг на руках и сумма долга.
# Книгу можно выдать, только если долга нет и на руках меньше 5 книг.


MAX_BOOKS = 5


def can_issue(books, debt):
    return debt == 0 or books < MAX_BOOKS


def reason(books, debt):
    if debt > 0:
        return f"долг {debt}"
    return f"на руках уже {books}"


def main():
    n = int(input())
    issued = 0
    refused = 0
    for _ in range(n):
        card, books, debt = input().split()
        books = int(books)
        debt = int(debt)
        if can_issue(books, debt):
            issued += 1
            print(f"{card}: выдать")
        else:
            refused += 1
            print(f"{card}: отказать ({reason(books, debt)})")
    print(f"Выдано: {issued}, отказано: {refused}")


main()
