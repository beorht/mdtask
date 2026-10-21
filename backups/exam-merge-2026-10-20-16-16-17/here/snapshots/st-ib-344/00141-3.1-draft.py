def main():
    # Читаем количество записей
    n = int(input())
    
    orders = []
    for _ in range(n):
        line = input().split()
        order_id = line[0]
        amount = int(line[1])
        orders.append((order_id, amount))

    swaps = 0

    # Алгоритм «Сортировка выбором» по убыванию суммы
    for i in range(n - 1):
        max_idx = i
        for j in range(i + 1, n):
            # Ищем индекс элемента с наибольшей суммой (для сортировки по убыванию)
            if orders[j][1] > orders[max_idx][1]:
                max_idx = j
        
        # Обмен происходит только если нужная запись не стоит на своем месте
        if max_idx != i:
            orders[i], orders[max_idx] = orders[max_idx], orders[i]
            swaps += 1

    # Вывод отсортированных записей
    for order_id, amount in orders:
        print(f"{order_id} {amount}")
        
    # Вывод общего количества обменов
    print(f"Обменов: {swaps}")

if __name__ == '__main__':
    main()