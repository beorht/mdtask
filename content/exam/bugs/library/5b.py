# Популярные авторы.
# В каждой строке — фамилия автора книги, которую выдали.
# Программа считает выдачи по авторам и печатает авторов по убыванию числа выдач
# (при равенстве — по алфавиту).


def read_authors():
    n = int(input())
    authors = []
    for _ in range(n):
        authors.append(input().strip())
    return authors


def count_authors(authors):
    counts = {}
    for author in authors:
        counts[author] += 1
    return counts


def main():
    authors = read_authors()
    counts = count_authors(authors)
    ranking = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    for place, (author, times) in enumerate(ranking, start=1):
        print(f"{place}. {author}: {times}")
    print(f"Разных авторов: {len(counts)}")


main()
