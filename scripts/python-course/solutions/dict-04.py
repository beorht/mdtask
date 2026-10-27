n = int(input())
d = {}
for _ in range(n):
    en, ru = input().split()
    d[en] = ru
print(" ".join(d.get(w, w) for w in input().split()))
