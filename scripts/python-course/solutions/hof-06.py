def memoize(func):
    cache = {}
    def wrapper(n):
        if n not in cache:
            cache[n] = func(n)
        return cache[n]
    return wrapper

@memoize
def ways(n):
    if n < 2:
        return 1
    return ways(n - 1) + ways(n - 2)

print(ways(int(input())))
