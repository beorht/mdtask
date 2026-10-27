import random
import string

random.seed(int(input()))
n = int(input())
alphabet = string.ascii_letters + string.digits
print("".join(random.choice(alphabet) for _ in range(n)))
