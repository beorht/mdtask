import random

random.seed(int(input()))
words = input().split()
random.shuffle(words)
print(" ".join(words))
