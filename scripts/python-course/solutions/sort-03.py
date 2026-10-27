a = list(map(int, input().split()))
n = len(a)
for p in range(1, n):
    for i in range(n - p):
        if a[i] > a[i + 1]:
            a[i], a[i + 1] = a[i + 1], a[i]
print(" ".join(map(str, a)))
