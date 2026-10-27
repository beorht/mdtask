counts = {}
for w in input().lower().split():
    counts[w] = counts.get(w, 0) + 1
best = None
for w, k in counts.items():
    if best is None or k > counts[best]:
        best = w
print(best, counts[best])
