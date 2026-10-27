a = list(map(int, input().split()))
b = list(map(int, input().split()))
i = j = 0
res = []
while i < len(a) and j < len(b):
    if a[i] <= b[j]:
        res.append(a[i])
        i += 1
    else:
        res.append(b[j])
        j += 1
res += a[i:] + b[j:]
print(" ".join(map(str, res)))
