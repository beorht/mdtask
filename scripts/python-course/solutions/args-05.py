def average(*nums, digits=2):
    if not nums:
        return 0
    s = 0
    for x in nums:
        s += x
    return round(s / len(nums), digits)

d = input()
nums = list(map(float, input().split()))
if d == "":
    print(average(*nums))
else:
    print(average(*nums, digits=int(d)))
