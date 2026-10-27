n = int(input())
data = {}
for _ in range(n):
    k, v = input().split()
    data[k] = v
back = {}
for k, v in data.items():
    back.setdefault(v, []).append(k)
for v, keys in back.items():
    print(f"{v}: {', '.join(keys)}")
