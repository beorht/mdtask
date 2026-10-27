import statistics

nums = list(map(float, input().split()))
print(round(statistics.mean(nums), 2), round(statistics.median(nums), 2))
