import sys

def main():
    try:
        first_line = input()
        if not first_line:
            return
        n = int(first_line.strip())
        
        records = []
        for _ in range(n):
            record_line = input()
            parts = record_line.strip().split()
            # Сохраняем шифр книги (строка) и число выдач (целое число для корректного сравнения)
            records.append([parts[0], int(parts[1])])
            
        swaps = 0
        
        # Сортировка выбором по убыванию
        for i in range(n - 1):
            max_idx = i
            for j in range(i + 1, n):
                # Ищем наибольшее значение для сортировки по убыванию
                if records[j][1] > records[max_idx][1]:
                    max_idx = j
            
            # Обмен производится, только если максимальный элемент не стоит на своём месте
            if max_idx != i:
                records[i], records[max_idx] = records[max_idx], records[i]
                swaps += 1
                
        # Вывод отсортированных записей
        for cipher, count in records:
            print(f"{cipher} {count}")
            
        # Вывод общего количества обменов
        print(f"Обменов: {swaps}")
        
    except Exception:
        pass

if __name__ == "__main__":
    main()