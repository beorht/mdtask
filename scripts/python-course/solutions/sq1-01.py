import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, phone TEXT)")
n = int(input())
conn.executemany("INSERT INTO users VALUES (?, ?)", [tuple(input().split()) for _ in range(n)])
while True:
    q = input()
    if q == "конец":
        break
    row = conn.execute("SELECT phone FROM users WHERE name = ?", (q,)).fetchone()
    print(row[0] if row else "Не найден")
