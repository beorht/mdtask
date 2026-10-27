word = input()
seen = set()
repeated = set()
for ch in word:
    if ch in seen:
        repeated.add(ch)
    seen.add(ch)
print("".join(sorted(repeated)) if repeated else "Нет повторов")
