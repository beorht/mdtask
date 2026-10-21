import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    
    n = int(input_data[0])
    orders = []
    idx = 1
    for _ in range(n):
        order_id = input_data[idx]
        amount = int(input_data[idx+1])
        orders.append((order_id, amount))
        idx += 2

    swaps = 0

    # Сортировка выбором по убыванию суммы
    for i in range(n - 1):
        max_idx = i
        for j in range(i + 1, n):
            # Ищем максимальное значение для сортировки по убыванию
            if orders[j][1] > orders[max_idx][1]:
                max_idx = j
        
        # Обмен считается, только если записи действительно меняются местами
        if max_idx != i:
            orders[i], orders[max_idx] = orders[max_idx], orders[i]
            swaps += 1

    # Вывод результатов
    for order_id, amount in orders:
        print(f"{order_id} {amount}")
    print(f"Обменов: {swaps}")

if __name__ == '__main__':
    main()