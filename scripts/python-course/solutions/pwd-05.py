import random
import string

SPECIAL = "!@#$%"
alphabet = string.ascii_letters + string.digits + SPECIAL

def strong(p):
    return (any(c.islower() for c in p) and any(c.isupper() for c in p)
            and any(c.isdigit() for c in p) and any(c in SPECIAL for c in p))

random.seed(int(input()))
k = int(input())
n = int(input())
for _ in range(k):
    p = "".join(random.choice(alphabet) for _ in range(n))
    print(f"{p} — {'надёжный' if strong(p) else 'слабый'}")
