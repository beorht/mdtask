def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

a = int(input())
b = int(input())
primes = []
for k in range(a, b + 1):
    if is_prime(k):
        primes.append(str(k))
print(" ".join(primes) if primes else "нет")
