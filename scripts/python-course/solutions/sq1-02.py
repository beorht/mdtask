import sqlite3

conn = sqlite3.connect(":memory:")
cur = conn.cursor()
cur.execute("CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT)")
for _ in range(int(input())):
    t = input()
    cur.execute("INSERT INTO tasks (title) VALUES (?)", (t,))
    print(f"#{cur.lastrowid} {t}")
print("Всего:", cur.execute("SELECT COUNT(*) FROM tasks").fetchone()[0])
