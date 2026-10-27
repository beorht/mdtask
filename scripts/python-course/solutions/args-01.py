def power(x, n=2):
    return x ** n

k = int(input())
for _ in range(k):
    parts = list(map(int, input().split()))
    print(power(*parts))
