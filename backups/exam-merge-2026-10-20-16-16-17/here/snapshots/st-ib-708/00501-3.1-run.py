import sys


def main():
    # Читаем все данные из стандартного ввода
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    # Число записей N
    n = int(input_data[0])

    # Считываем N пар (номер талона, длительность)
    records = []
    idx = 1
    for _ in range(n):
        ticket_id = input_data[idx]
        duration = int(input_data[idx + 1])
        records.append((ticket_id, duration))
        idx += 2

    # Заданное число минут M
    m = int(input_data[idx])

    # Переменная-счётчик найденных записей
    found_count = 0

    # Линейный поиск: проходим по списку записей с первой до последней
    for record in records:
        ticket_id = record[0]
        duration = record[1]

        # Если длительность приема строго больше M
        if duration > m:
            print(ticket_id)
            found_count += 1

    # Выводим общее количество найденных записей
    print(f"Найдено: {found_count}")


if __name__ == "__main__":
    main()