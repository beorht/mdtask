import sqlite3

conn = sqlite3.connect("school.db")
conn.execute("CREATE TABLE marks (name TEXT, mark INTEGER)")
for _ in range(int(input())):
    name, mark = input().split()
    conn.execute("INSERT INTO marks VALUES (?, ?)", (name, int(mark)))
conn.commit()
conn.close()

conn = sqlite3.connect("school.db")
count, avg = conn.execute("SELECT COUNT(*), AVG(mark) FROM marks").fetchone()
print(f"Записей: {count}")
print(f"Средняя: {round(avg, 2)}")
conn.close()
