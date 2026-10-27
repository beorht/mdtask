def digit_sum(n):
    s = 0
    while n > 0:
        s += n % 10
        n //= 10
    return s

best = None
for x in map(int, input().split()):
    if best is None or digit_sum(x) > digit_sum(best):
        best = x
print(best, digit_sum(best))
