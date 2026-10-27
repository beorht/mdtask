a = list(map(int, input().split()))
n = len(a)
swaps = 0
passes = 0
for p in range(1, n):
    passes += 1
    swapped = False
    for i in range(n - p):
        if a[i] > a[i + 1]:
            a[i], a[i + 1] = a[i + 1], a[i]
            swaps += 1
            swapped = True
    if not swapped:
        break
print(" ".join(map(str, a)))
print(swaps)
print(passes)
