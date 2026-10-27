def mask(word, opened):
    return " ".join(ch if ch in opened else "_" for ch in word)

word = input()
opened = set()
moves = 0
while not all(ch in opened for ch in word):
    opened.add(input().lower())
    moves += 1
    print(mask(word, opened))
print(f"Победа! Ходов: {moves}")
