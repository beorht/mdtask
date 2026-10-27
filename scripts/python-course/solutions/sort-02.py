a = list(map(int, input().split()))
x = int(input())
pos = []
comparisons = 0
for i in range(len(a)):
    comparisons += 1
    if a[i] == x:
        pos.append(str(i))
print(" ".join(pos) if pos else "Нет")
print(comparisons)
