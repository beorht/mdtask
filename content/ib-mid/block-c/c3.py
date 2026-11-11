# Сводка по журналу событий.
# Ввод: первая строка — число строк N; далее N строк вида «ВРЕМЯ УРОВЕНЬ СООБЩЕНИЕ…»
# (уровень — второе слово: INFO/WARN/ERROR). Вывод: по алфавиту «УРОВЕНЬ число»,
# затем «Всего: N», «Ошибок: E» (число строк уровня ERROR) и «Чаще всего: УРОВЕНЬ»
# (уровень с наибольшим числом записей; при равенстве — меньший по алфавиту).

def parse_levels(n):
    counts = {}
    for _ in range(n):
        words = input().split()
        # уровень — второе поле строки журнала
        level = words[0]
        counts[level] = counts.get(level, 0) + 1
    return counts

def most_common(counts):
    best = None
    for level in sorted(counts):
        if best is None or counts[level] > counts[best]:
            best = level
    return best

def main():
    n = int(input())
    counts = parse_levels(n)
    total = 0
    for level in sorted(counts):
        print(level, counts[level])
        total += counts[level]
    print("Всего:", total)
    print("Ошибок:", counts.get("ERROR", 0))
    print("Чаще всего:", most_common(counts))

main()
