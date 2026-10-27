import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stock (name TEXT, qty INTEGER)")
for _ in range(int(input())):
    n, q = input().split()
    conn.execute("INSERT INTO stock VALUES (?, ?)", (n, int(q)))
cur = conn.execute("DELETE FROM stock WHERE qty = 0")
print("Удалено:", cur.rowcount)
for row in conn.execute("SELECT name, qty FROM stock ORDER BY qty DESC, name"):
    print(*row)
