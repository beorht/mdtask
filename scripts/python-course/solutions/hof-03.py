def make_multiplier(k):
    def multiply(x):
        return x * k
    return multiply

f = make_multiplier(int(input()))
print(" ".join(str(f(int(x))) for x in input().split()))
