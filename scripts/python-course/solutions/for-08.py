n = int(input())
prime = True
for d in range(2, n):
    if n % d == 0:
        prime = False
print("Простое" if prime else "Составное")
