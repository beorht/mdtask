class Book:
    def __init__(self, title, author, year):
        self.title = title
        self.author = author
        self.year = year

    def __str__(self):
        return f"«{self.title}» — {self.author} ({self.year})"

    def __repr__(self):
        return f"Book('{self.title}', '{self.author}', {self.year})"

books = []
for _ in range(int(input())):
    t, a, y = input().split(";")
    books.append(Book(t, a, int(y)))
for b in books:
    print(b)
print(books)
