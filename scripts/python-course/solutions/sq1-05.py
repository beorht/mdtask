import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE grades (student TEXT, subject TEXT, mark INTEGER)")
n = int(input())
rows = []
for _ in range(n):
    s, sub, m = input().split()
    rows.append((s, sub, int(m)))
conn.executemany("INSERT INTO grades VALUES (?, ?, ?)", rows)
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    if p[0] == "avg":
        v = conn.execute("SELECT AVG(mark) FROM grades WHERE student = ?", (p[1],)).fetchone()[0]
        print(round(v, 2) if v is not None else "нет оценок")
    elif p[0] == "best":
        row = conn.execute("SELECT student FROM grades WHERE subject = ? GROUP BY student ORDER BY AVG(mark) DESC, student LIMIT 1", (p[1],)).fetchone()
        print(row[0] if row else "нет оценок")
    elif p[0] == "count":
        print(conn.execute("SELECT COUNT(*) FROM grades").fetchone()[0])
