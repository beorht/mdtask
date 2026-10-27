nums = list(map(int, input().split()))
nums.sort(reverse=True)
print(" ".join(map(str, nums)))
print(nums.count(nums[0]))
