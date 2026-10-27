n = int(input())
p = 1
out = []
while p <= n:
    out.append(str(p))
    p *= 2
print(" ".join(out))
