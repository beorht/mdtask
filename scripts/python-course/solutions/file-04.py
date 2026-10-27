best = ""
with open("poem.txt", encoding="utf-8") as f:
    for line in f:
        line = line.rstrip("\n")
        if len(line) > len(best):
            best = line
print(f"{best} — {len(best)}")
