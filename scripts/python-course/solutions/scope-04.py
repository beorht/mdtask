TAX = 12

def print_price(name, price):
    print(f"{name}: {round(price * (100 + TAX) / 100, 2)}")

n = int(input())
for _ in range(n):
    name, price = input().split()
    print_price(name, float(price))
