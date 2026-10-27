counts = {}
errors = []
with open("log.txt", encoding="utf-8") as f:
    for line in f:
        level, _, message = line.strip().partition(" ")
        if not level:
            continue
        counts[level] = counts.get(level, 0) + 1
        if level == "ERROR":
            errors.append(message)
for level, k in counts.items():
    print(f"{level}: {k}")
for m in errors:
    print(f"! {m}")
