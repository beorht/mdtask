nums = list(map(int, input().split()))
t = int(input())
seen = set()
found = False
for x in nums:
    if t - x in seen:
        found = True
        break
    seen.add(x)
print("Да" if found else "Нет")
