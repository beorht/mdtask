class Book:
    def __init__(self, title):
        self.title = title
        self.reader = None

class Library:
    def __init__(self):
        self.books = {}

    def add(self, title):
        self.books[title] = Book(title)

    def _get(self, title):
        if title not in self.books:
            raise ValueError("нет книги")
        return self.books[title]

    def borrow(self, title, reader):
        book = self._get(title)
        if book.reader is not None:
            raise ValueError("уже выдана")
        book.reader = reader

    def give_back(self, title):
        book = self._get(title)
        if book.reader is None:
            raise ValueError("не выдавалась")
        book.reader = None

    def report(self):
        for t in sorted(self.books):
            r = self.books[t].reader
            print(f"{t} — {r if r else 'на полке'}")

lib = Library()
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    try:
        if p[0] == "добавить":
            lib.add(p[1])
        elif p[0] == "выдать":
            lib.borrow(p[1], p[2])
        elif p[0] == "вернуть":
            lib.give_back(p[1])
        elif p[0] == "отчёт":
            lib.report()
    except ValueError as e:
        print(f"Ошибка: {e}")
