age = int(input())
day = input().lower()
price = 20000 if age < 12 else 40000
if day == "среда":
    price -= 10000
print(price)
