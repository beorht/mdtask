nums = list(map(int, input().split()))
even = 0
for x in nums:
    if x % 2 == 0:
        even += 1
print("Чётных:", even)
print("Нечётных:", len(nums) - even)
