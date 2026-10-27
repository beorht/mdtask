n = int(input())
with open("out.txt", "w", encoding="utf-8") as f:
    for _ in range(n):
        f.write(input() + "\n")
with open("out.txt", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        print(f"{i}: {line.rstrip()}")
