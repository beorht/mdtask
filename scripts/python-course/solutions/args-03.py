def format_price(value, currency="сум"):
    return f"{value:,}".replace(",", " ") + " " + currency

n = int(input())
for _ in range(n):
    parts = input().split()
    if len(parts) == 1:
        print(format_price(int(parts[0])))
    else:
        print(format_price(int(parts[0]), parts[1]))
