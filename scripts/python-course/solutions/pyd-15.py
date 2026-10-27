freq = {}
lengths = 0
count = 0
for raw in input().lower().split():
    word = raw.strip('.,!?;:"«»()-')
    if word:
        freq[word] = freq.get(word, 0) + 1
        lengths += len(word)
        count += 1
items = list(freq.items())
for i in range(1, len(items)):
    j = i
    while j > 0 and items[j][1] > items[j - 1][1]:
        items[j], items[j - 1] = items[j - 1], items[j]
        j -= 1
print(f"Уникальных слов: {len(freq)}")
print(f"Самое частое: {items[0][0]}")
print("Топ-5:")
for word, k in items[:5]:
    print(f"{word} — {k}")
print(f"Средняя длина: {round(lengths / count, 2)}")
