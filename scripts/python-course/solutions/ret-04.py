def min_max(nums):
    lo = hi = nums[0]
    for x in nums:
        if x < lo:
            lo = x
        if x > hi:
            hi = x
    return lo, hi

lo, hi = min_max(list(map(int, input().split())))
print(lo, hi)
