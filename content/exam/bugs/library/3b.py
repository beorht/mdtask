# Книги большого объёма.
# В каждой строке — шифр книги и число страниц. Последняя строка — граница N.
# Программа печатает книги, в которых больше N страниц, и их средний объём.


def read_books():
    n = int(input())
    books = []
    for _ in range(n):
        code, pages = input().split()
        books.append((code, int(pages)))
    return books


def thick_books(books, limit):
    result = []
    for code, pages in books:
        if pages > limit:
            result.append((code, pages))
    return result


def main():
    books = read_books()
    limit = input()
    result = thick_books(books, limit)
    print(f"Книг больше {limit} страниц: {len(result)}")
    total = 0
    for code, pages in result:
        print(f"{code}: {pages} стр.")
        total += pages
    if result:
        print(f"Средний объём: {total // len(result)} стр.")


main()
