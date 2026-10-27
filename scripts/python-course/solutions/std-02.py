import random

random.seed(int(input()))
names = input().split()
print(f"Сегодня дежурит {random.choice(names)}")
