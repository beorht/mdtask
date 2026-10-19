# Справка о читателях.
# Сначала — список читателей: билет и фамилия.
# Потом — номера билетов, по которым нужна справка.


def read_readers():
    n = int(input())
    readers = []
    for _ in range(n):
        card, name = input().split()
        readers.append((card, name))
    return readers


def find_reader(readers, card):
    for reader_card, name in readers:
        if reader_card == card:
            return name
        return None


def main():
    readers = read_readers()
    m = int(input())
    found = 0
    for _ in range(m):
        card = input()
        name = find_reader(readers, card)
        if name is None:
            print(f"{card}: читатель не найден")
        else:
            found += 1
            print(f"{card}: {name}")
    print(f"Найдено читателей: {found} из {m}")


main()
