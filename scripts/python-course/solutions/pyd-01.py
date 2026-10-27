counts = {}
for w in input().split():
    counts[w] = counts.get(w, 0) + 1
for w, k in counts.items():
    form = "раза" if k % 10 in (2, 3, 4) and k % 100 not in (12, 13, 14) else "раз"
    print(f"{w} — {k} {form}")
