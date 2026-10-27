n = int(input())
rows = []
for _ in range(n):
    name, score = input().split()
    rows.append((name, int(score)))
for p in range(1, n):
    for i in range(n - p):
        if (-rows[i][1], rows[i][0]) > (-rows[i + 1][1], rows[i + 1][0]):
            rows[i], rows[i + 1] = rows[i + 1], rows[i]
for place, (name, score) in enumerate(rows, 1):
    print(f"{place}. {name} — {score}")
