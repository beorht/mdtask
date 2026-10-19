# Проверка записей к врачу.
# Поликлиника принимает с 08:00 до 18:00:
# приём можно назначить на время от 08:00 до 18:00 включительно.
# В каждой строке — номер талона и время приёма ЧЧ:ММ.


OPEN = 8 * 60
CLOSE = 18 * 60


def to_minutes(text):
    hours, minutes = text.split(":")
    return int(hours) * 60 + int(minutes)


def in_working_hours(time_text):
    minutes = to_minutes(time_text)
    return OPEN <= minutes <= CLOSE


def main():
    n = int(input())
    wrong = []
    for _ in range(n):
        ticket, time_text = input().split()
        if in_working_hours(time_text):
            print(f"{ticket} {time_text}: запись принята")
        else:
            print(f"{ticket} {time_text}: вне рабочего времени")
            wrong.append(ticket)
    if wrong:
        print("Перенести: " + ", ".join(wrong))
    else:
        print("Все записи в рабочее время")


main()
