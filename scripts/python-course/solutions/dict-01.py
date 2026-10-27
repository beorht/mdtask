n = int(input())
book = {}
for _ in range(n):
    name, phone = input().split()
    book[name] = phone
q = input()
print(book.get(q, "Не найден"))
