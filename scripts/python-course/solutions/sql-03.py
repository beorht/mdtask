import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE goods (name TEXT, category TEXT, price INTEGER)")
for _ in range(int(input())):
    n, c, p = input().split()
    conn.execute("INSERT INTO goods VALUES (?, ?, ?)", (n, c, int(p)))
cat = input()
pct = int(input())
conn.execute("UPDATE goods SET price = price * (100 + ?) / 100 WHERE category = ?", (pct, cat))
for row in conn.execute("SELECT name, category, price FROM goods ORDER BY name"):
    print(*row)
