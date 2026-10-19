# Расписание врача на день.
# В каждой строке — время приёма и логин врача. Последняя строка — логин врача.
# Программа печатает время всех его приёмов и сколько их.


def read_schedule():
    n = int(input())
    schedule = []
    for _ in range(n):
        time, doctor = input().split()
        schedule.append((time, doctor))
    return schedule


def doctor_times(schedule, doctor):
    times = []
    for i in range(1, len(schedule)):
        time, name = schedule[i]
        if name == doctor:
            times.append(time)
    return times


def main():
    schedule = read_schedule()
    doctor = input()
    times = doctor_times(schedule, doctor)
    print(f"Врач: {doctor}")
    if not times:
        print("Приёмов нет")
        return
    print("Приёмы: " + ", ".join(times))
    print(f"Всего приёмов: {len(times)}")
    print(f"Первый приём: {times[0]}, последний: {times[-1]}")


main()
