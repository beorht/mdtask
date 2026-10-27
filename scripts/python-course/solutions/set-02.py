a = set(input().split())
b = set(input().split())
common = sorted(a & b)
print(" ".join(common) if common else "Нет")
