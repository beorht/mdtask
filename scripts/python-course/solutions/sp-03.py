a = list(map(int, input().split()))
x = int(input())
lo, hi = 0, len(a) - 1
steps = 0
pos = -1
while lo <= hi:
    mid = (lo + hi) // 2
    steps += 1
    if a[mid] == x:
        pos = mid
        break
    if a[mid] < x:
        lo = mid + 1
    else:
        hi = mid - 1
print(pos)
print(steps)
