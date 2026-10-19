# Самая популярная и самая непопулярная книга.
# В каждой строке — шифр книги и сколько раз её выдавали за год.


def read_books():
    n = int(input())
    books = []
    for _ in range(n):
        code, times = input().split()
        books.append([code, times])
    return books


def most_popular(books):
    best = books[0]
    for book in books[1:]:
        if book[1] > best[1]:
            best = book
    return best


def least_popular(books):
    worst = books[0]
    for book in books[1:]:
        if book[1] < worst[1]:
            worst = book
    return worst


def main():
    books = read_books()
    best = most_popular(books)
    worst = least_popular(books)
    total = 0
    for book in books:
        total += int(book[1])
    print(f"Чаще всего выдавали: {best[0]} ({best[1]} раз)")
    print(f"Реже всего выдавали: {worst[0]} ({worst[1]} раз)")
    print(f"Всего выдач: {total}")


main()
