def is_even(n):
    return n % 2 == 0

out = []
for x in map(int, input().split()):
    if is_even(x):
        out.append(str(x))
print(" ".join(out) if out else "Нет")
