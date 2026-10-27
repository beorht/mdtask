import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE pupils (id INTEGER PRIMARY KEY, name TEXT, mark INTEGER)")
for _ in range(int(input())):
    name, mark = input().split()
    conn.execute("INSERT INTO pupils (name, mark) VALUES (?, ?)", (name, int(mark)))
for i in map(int, input().split()):
    row = conn.execute("SELECT name, mark FROM pupils WHERE id = ?", (i,)).fetchone()
    print(f"{row[0]}: {row[1]}" if row else f"Нет ученика {i}")
