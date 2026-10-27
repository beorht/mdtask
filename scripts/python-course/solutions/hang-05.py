def play(word):
    opened = set()
    errors = 0
    while errors < 6 and not all(ch in opened for ch in word):
        ch = input().lower()
        if len(ch) != 1 or not ch.isalpha() or ch in opened:
            continue
        opened.add(ch)
        if ch not in word:
            errors += 1
    return errors < 6

n = int(input())
wins = 0
for i in range(1, n + 1):
    won = play(input())
    wins += won
    print(f"Раунд {i}: {'победа' if won else 'поражение'}")
print(f"Побед: {wins} из {n}")
