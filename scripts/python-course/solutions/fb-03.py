n = int(input())
k = int(input())
rules = []
for _ in range(k):
    d, word = input().split()
    rules.append((int(d), word))
out = []
for i in range(1, n + 1):
    word = "".join(w for d, w in rules if i % d == 0)
    out.append(word or str(i))
print(" ".join(out))
