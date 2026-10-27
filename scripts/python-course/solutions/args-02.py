def total(*nums):
    s = 0
    for x in nums:
        s += x
    return s

print(total(*map(int, input().split())))
