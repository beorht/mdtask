items = input().split()
w = input()
if w in items:
    items.remove(w)
    print(" ".join(items))
else:
    print("Нет в списке")
