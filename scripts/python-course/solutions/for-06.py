nums = list(map(int, input().split()))
best = nums[0]
pos = 1
for i in range(len(nums)):
    if nums[i] > best:
        best = nums[i]
        pos = i + 1
print(best, pos)
