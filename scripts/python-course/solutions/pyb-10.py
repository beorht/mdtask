def stats(numbers):
    lo = hi = numbers[0]
    total = 0
    for x in numbers:
        if x < lo:
            lo = x
        if x > hi:
            hi = x
        total += x
    return lo, hi, total / len(numbers)

nums = [int(x) for x in input().split()]
lo, hi, avg = stats(nums)
print(f"Минимум: {lo}")
print(f"Максимум: {hi}")
print(f"Среднее: {round(avg, 2)}")
