nums = list(map(int, input().split()))
first = None
second = None
for x in nums:
    if first is None or x > first:
        if first is not None:
            second = first
        first = x
    elif x != first and (second is None or x > second):
        second = x
print(second)
