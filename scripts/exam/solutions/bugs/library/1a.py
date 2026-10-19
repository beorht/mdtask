# Какие книги сейчас на руках у читателя.
# В журнале выдач — читательский билет, шифр книги и состояние: выдана или возвращена.
# Последняя строка — билет читателя, о котором нужна справка.


def read_loans():
    n = int(input())
    loans = []
    for _ in range(n):
        card, code, state = input().split()
        loans.append((card, code, state))
    return loans


def books_on_hand(loans, card):
    result = []
    for i in range(0, len(loans)):
        loan_card, code, state = loans[i]
        if loan_card == card and state == "выдана":
            result.append(code)
    return result


def main():
    loans = read_loans()
    card = input()
    books = books_on_hand(loans, card)
    print(f"Читатель {card}")
    if not books:
        print("Книг на руках нет")
        return
    for code in books:
        print(f"- {code}")
    print(f"Всего на руках: {len(books)}")
    if len(books) >= 5:
        print("Новые книги не выдавать: на руках 5 и больше")


main()
