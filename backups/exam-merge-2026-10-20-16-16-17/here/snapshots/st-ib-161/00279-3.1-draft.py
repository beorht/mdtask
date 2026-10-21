import sys

def main():
    # Считываем все строки из стандартного ввода
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    
    # Количество записей
    n = int(lines[0])
    
    # Сохраняем записи в список пар (номер выдачи, шифр книги)
    records = []
    for i in range(1, n + 1):
        parts = lines[i].split()
        records.append((parts[0], parts[1]))
    
ль    # Искомый шифр книги находится на последней строке
    target_cipher = lines[n + 1].strip()
    
    comparisons = 0
    found_index = -1
    found_loan = ""
    
    # Линейный поиск
    for i in range(n):
        comparisons += 1
        # Сравниваем шифр книги в текущей записи с искомым
        if records[i][1] == target_cipher:
            found_index = i + 1  # Нумерация строк с 1
            found_loan = records[i][0]
            break  # Останавливаем поиск при первой нахождении
            
    # Вывод результатов в соответствии с форматом
    if found_index != -1:
        print(f"Найдено: строка {found_index}, {found_loan}")
        print(f"Сравнений: {comparisons}")
    else:
        print("Не найдено")
        print(f"Сравнений: {comparisons}")

if __name__ == "__main__":
    main()