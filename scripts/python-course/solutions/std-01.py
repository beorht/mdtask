import random

random.seed(int(input()))
n = int(input())
rolls = [random.randint(1, 6) for _ in range(n)]
print(" ".join(map(str, rolls)))
print(sum(rolls))
