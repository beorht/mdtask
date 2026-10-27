groups = {}
for w in input().split():
    groups.setdefault(w[0], []).append(w)
for letter, ws in groups.items():
    print(f"{letter}: {', '.join(ws)}")
