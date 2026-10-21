def read_sales():
    n = int(input())
    sales = []
    for _ in range(n):
        day, revenue = input().split()
        sales.append((day, int(revenue)))
    return sales

def main():
    sales = read_sales()
    total_revenue = 0
    cumulative_total = 0
    best_day = ""
    best_revenue = -1

    for day, revenue in sales:
        cumulative_total += revenue
        total_revenue += revenue
        
        if revenue > best_revenue:
            best_revenue = revenue
            best_day = day
            
        print(f"{day}: {revenue}, с начала периода {cumulative_total}")
        
    print(f"Выручка за период: {total_revenue}")
    print(f"Лучший день: {best_day} ({best_revenue})")

if __name__ == '__main__':
    main()
