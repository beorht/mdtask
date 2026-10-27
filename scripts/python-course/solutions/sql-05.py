import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE sales (city TEXT, amount INTEGER)")
for _ in range(int(input())):
    c, a = input().split()
    conn.execute("INSERT INTO sales VALUES (?, ?)", (c, int(a)))
for city, total, k in conn.execute("SELECT city, SUM(amount), COUNT(*) FROM sales GROUP BY city ORDER BY SUM(amount) DESC, city"):
    print(f"{city}: {total} (заказов: {k})")
print(round(conn.execute("SELECT AVG(amount) FROM sales").fetchone()[0], 2))
