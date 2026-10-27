a = list(map(int, input().split()))
shifts = 0
for i in range(1, len(a)):
    x = a[i]
    j = i - 1
    while j >= 0 and a[j] > x:
        a[j + 1] = a[j]
        j -= 1
        shifts += 1
    a[j + 1] = x
print(" ".join(map(str, a)))
print(shifts)
