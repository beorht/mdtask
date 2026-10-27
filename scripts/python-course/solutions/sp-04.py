a = list(map(int, input().split()))
x = int(input())
lo, hi = 0, len(a) - 1
ans = -1
while lo <= hi:
    mid = (lo + hi) // 2
    if a[mid] == x:
        ans = mid
        hi = mid - 1
    elif a[mid] < x:
        lo = mid + 1
    else:
        hi = mid - 1
print(ans)
