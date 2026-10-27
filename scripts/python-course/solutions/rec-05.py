moves = 0

def hanoi(n, src, dst, tmp):
    global moves
    if n == 0:
        return
    hanoi(n - 1, src, tmp, dst)
    print(f"диск {n}: {src} -> {dst}")
    moves += 1
    hanoi(n - 1, tmp, dst, src)

hanoi(int(input()), "A", "C", "B")
print(f"Ходов: {moves}")
