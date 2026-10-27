n = int(input())
sums = {}
cnt = {}
for _ in range(n):
    name, mark = input().split()
    sums[name] = sums.get(name, 0) + int(mark)
    cnt[name] = cnt.get(name, 0) + 1
for name in sums:
    print(f"{name}: {round(sums[name] / cnt[name], 2)}")
