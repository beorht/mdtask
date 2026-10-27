w = input().split()
n = len(w)
for p in range(1, n):
    for i in range(n - p):
        if (-len(w[i]), w[i]) > (-len(w[i + 1]), w[i + 1]):
            w[i], w[i + 1] = w[i + 1], w[i]
print(" ".join(w))
