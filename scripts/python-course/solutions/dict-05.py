n = int(input())
rev = {}
for _ in range(n):
    country, capital = input().split()
    rev[capital] = country
print(rev.get(input(), "Нет данных"))
