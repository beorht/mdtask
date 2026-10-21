import sys

def main():
    # Читаем все непустые строки из стандартного ввода
    lines = [line.strip() for line in sys.stdin if line.strip()]
    if not lines:
        return
    
    n = int(lines[0])
    records = []
    for i in range(1, n + 1):
        parts = lines[i].split()
        records.append((parts[0], parts[1]))
        
    target_cipher = lines[n + 1]
    
    comparisons = 0
    found_index = -1
    found_loan = ""
    
    # Линейный поиск
    for i in range(n):
        comparisons += 1
        if records[i][1] == target_cipher:
            found_index = i + 1
            found_loan = records[i][0]
            break
            
    if found_index != -1:
        print(f"Найдено: строка {found_index}, {found_loan}")
        print(f"Сравнений: {comparisons}")
    else:
        print("Не найдено")
        print(f"Сравнений: {comparisons}")

if __name__ == "__main__":
    main()