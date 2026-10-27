word = input()
counts = {}
for ch in word:
    counts[ch] = counts.get(ch, 0) + 1
for ch, k in counts.items():
    print(f"{ch}: {k}")
