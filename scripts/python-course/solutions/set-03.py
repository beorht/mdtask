a = set(map(int, input().split()))
b = set(map(int, input().split()))
only = sorted(a ^ b)
print(" ".join(map(str, only)) if only else "Нет")
