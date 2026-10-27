total = 0
count = 0
with open("numbers.txt", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            total += int(line)
            count += 1
print(total, count)
