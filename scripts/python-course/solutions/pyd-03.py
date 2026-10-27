names = input().split()
prices = input().split()
price = {}
for i in range(len(names)):
    price[names[i]] = int(prices[i])
total = 0
for item in input().split():
    total += price[item]
print(f"Итого: {total}")
