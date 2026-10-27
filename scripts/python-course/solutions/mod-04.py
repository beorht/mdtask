from collections import Counter

c = Counter(input().lower().split())
for word, k in c.most_common(3):
    print(f"{word}: {k}")
