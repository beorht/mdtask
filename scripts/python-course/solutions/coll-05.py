a = input().split()
b = input().split()
seen = {}
for x in b:
    seen[x] = True
out = []
for x in a:
    if x in seen and x not in out:
        out.append(x)
print(" ".join(out) if out else "Нет общих")
