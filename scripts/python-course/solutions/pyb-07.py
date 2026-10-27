n = int(input())
a, b = 0, 1
parts = []
while a <= n:
    parts.append(str(a))
    a, b = b, a + b
print(" ".join(parts))
