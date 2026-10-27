a = list(map(int, input().split()))
k = int(input())
for i in range(k):
    m = i
    for j in range(i + 1, len(a)):
        if a[j] < a[m]:
            m = j
    a[i], a[m] = a[m], a[i]
print(a[k - 1])
