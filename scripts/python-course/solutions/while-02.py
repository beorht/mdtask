n = int(input())
count = 0
total = 0
while n > 0:
    total += n % 10
    count += 1
    n //= 10
print(count)
print(total)
