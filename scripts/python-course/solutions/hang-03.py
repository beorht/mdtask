def mask(word, opened):
    return " ".join(ch if ch in opened else "_" for ch in word)

word = input()
opened = set()
errors = 0
moves = 0
while errors < 6 and not all(ch in opened for ch in word):
    ch = input().lower()
    opened.add(ch)
    moves += 1
    print(mask(word, opened))
    if ch not in word:
        errors += 1
        print(f"Ошибок: {errors}")
if errors == 6:
    print(f"Поражение. Слово: {word}")
else:
    print(f"Победа! Ходов: {moves}")
