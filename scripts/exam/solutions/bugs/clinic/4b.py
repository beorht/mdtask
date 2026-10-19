# Занятость кабинетов.
# Сначала — список занятых кабинетов и время (номер кабинета и время ЧЧ:ММ).
# Потом — запросы: кабинет и время.
# Для каждого запроса программа отвечает, свободен ли кабинет.


def read_busy():
    n = int(input())
    busy = []
    for _ in range(n):
        room, time = input().split()
        busy.append((room, time))
    return busy


def is_free(busy, room, time):
    for busy_room, busy_time in busy:
        if busy_room == room and busy_time == time:
            return False
    return True


def main():
    busy = read_busy()
    m = int(input())
    free_count = 0
    for _ in range(m):
        room, time = input().split()
        if is_free(busy, room, time):
            free_count += 1
            print(f"Кабинет {room} в {time}: свободен")
        else:
            print(f"Кабинет {room} в {time}: занят")
    print(f"Свободных из запрошенных: {free_count}")


main()
