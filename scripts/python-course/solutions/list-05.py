q = input().split()
name = input()
if name in q:
    print(q.index(name) + 1)
else:
    print("Нет в очереди")
