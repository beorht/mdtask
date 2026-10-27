sums = {}
cnt = {}
with open("grades.csv", encoding="utf-8") as f:
    next(f)
    for line in f:
        line = line.strip()
        if not line:
            continue
        name, mark = line.split(";")
        sums[name] = sums.get(name, 0) + int(mark)
        cnt[name] = cnt.get(name, 0) + 1
lines = [f"{n}: {round(sums[n] / cnt[n], 2)}" for n in sorted(sums)]
with open("report.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
for l in lines:
    print(l)
print(f"Записано строк: {len(lines)}")
