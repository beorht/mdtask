def print_max(nums):
    best = nums[0]
    for x in nums:
        if x > best:
            best = x
    print(best)

m = int(input())
for _ in range(m):
    print_max(list(map(int, input().split())))
