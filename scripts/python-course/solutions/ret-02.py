def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

n = int(input())
print(" ".join(str(x) for x in range(2, n + 1) if is_prime(x)))
