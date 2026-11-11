# Отчёт по выручке за месяцы.
# Ввод: первая строка — число записей N; далее N строк вида «ГГГГ-ММ СУММА».
# Вывод: по возрастанию месяца строки «ГГГГ-ММ сумма_за_месяц»,
# затем «Сделок: K», «Средний чек: S» (целое, округление вниз) и «Лидер: ГГГГ-ММ»
# (месяц с наибольшей суммарной выручкой).

def read_rows(n):
    rows = []
    for _ in range(n):
        parts = input().split()
        month = parts[0]
        amount = int(parts[1])
        rows.append((month, amount))
    return rows

def totals_by_month(rows):
    totals = {}
    for month, amount in rows:
        # накапливаем сумму по месяцу
        totals[month] = totals.get(month, 0) + amount
    return totals

def leader(totals):
    # месяц с максимальной суммарной выручкой
    return max(totals)

def main():
    n = int(input())
    rows = read_rows(n)
    totals = totals_by_month(rows)
    # месяцы выводим по возрастанию (строки ГГГГ-ММ сортируются хронологически)
    for month in sorted(totals):
        print(month, totals[month])
    deals = len(rows)
    revenue = 0
    for _, amount in rows:
        revenue += amount
    print("Сделок:", deals)
    print("Средний чек:", revenue // deals)
    print("Лидер:", leader(totals))

main()
