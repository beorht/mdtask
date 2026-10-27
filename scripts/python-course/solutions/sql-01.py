import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE students (name TEXT, age INTEGER)")
for _ in range(int(input())):
    name, age = input().split()
    conn.execute("INSERT INTO students VALUES (?, ?)", (name, int(age)))
for name, age in conn.execute("SELECT name, age FROM students ORDER BY name"):
    print(name, age)
