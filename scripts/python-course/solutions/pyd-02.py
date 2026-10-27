names = input().split()
phones = input().split()
book = {}
for i in range(len(names)):
    book[names[i]] = phones[i]
print(book.get(input(), "не найден"))
