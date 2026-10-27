counts = {}
for ch in input().lower():
    if ch.isalpha():
        counts[ch] = counts.get(ch, 0) + 1
found = False
for ch, k in counts.items():
    if ch in "аеёиоуыэюяaeiouy":
        print(f"{ch} — {k}")
        found = True
if not found:
    print("Гласных нет")
