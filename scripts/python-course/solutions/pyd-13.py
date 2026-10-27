n = int(input())
route = {}
for _ in range(n):
    a, b = input().split()
    route[a] = b
best = []
loop = False
for start in route:
    chain = [start]
    cur = start
    while True:
        nxt = route[cur]
        if nxt in chain:
            loop = True
            break
        chain.append(nxt)
        if nxt not in route:
            break
        cur = nxt
    if len(chain) > len(best):
        best = chain
print("Цепочка: " + " → ".join(best))
print(f"Длина: {len(best)}")
print("Зацикливание: " + ("есть" if loop else "нет"))
