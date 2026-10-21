import sys

def main():
    try:
        line = sys.stdin.readline()
        if not line:
            return
        n = int(line.strip())
        
        records = []
        for _ in range(n):
            record_line = sys.stdin.readline().strip()
            if record_line:
                parts = record_line.split()
                records.append((parts[0], parts[1]))
                
        target_cipher = sys.stdin.readline().strip()
        
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
    except Exception:
        pass

if __name__ == "__main__":
    main()