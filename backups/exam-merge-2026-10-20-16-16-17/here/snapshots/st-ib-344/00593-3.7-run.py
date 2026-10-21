def read_sales():
    n = int(input())
    sales_dict = {}
    for _ in range(n):
        sku, count = input().split()
        count = int(count)
        if sku in sales_dict:
            sales_dict[sku] += count
        else:
            sales_dict[sku] = count
    return sales_dict

def main():
    sales_dict = read_sales()
    print(f"Разных товаров: {len(sales_dict)}")
    
    # Сортируем товары:
    # 1. По количеству проданных штук по убыванию (-x[1])
    # 2. По алфавиту артикула по возрастанию (x[0])
    sorted_sales = sorted(sales_dict.items(), key=lambda x: (-x[1], x[0]))
    
    # Берем топ-3 товара
    top_3 = sorted_sales[:3]
    
    for i, (sku, count) in enumerate(top_3, 1):
        print(f"{i}. {sku} — {count} шт.")

if __name__ == '__main__':
    main()