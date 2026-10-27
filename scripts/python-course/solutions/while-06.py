total = 0
skipped = 0
while True:
    x = int(input())
    if x == 0:
        break
    if x < 0:
        skipped += 1
        continue
    total += x
print(total)
print(skipped)
