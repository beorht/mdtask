import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT)")
conn.execute("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_id INTEGER REFERENCES authors(id))")
for _ in range(int(input())):
    conn.execute("INSERT INTO authors (name) VALUES (?)", (input(),))
for _ in range(int(input())):
    title, aid = input().rsplit(" ", 1)
    conn.execute("INSERT INTO books (title, author_id) VALUES (?, ?)", (title, int(aid)))
while True:
    line = input()
    if line == "стоп":
        break
    title, aid = line.rsplit(" ", 1)
    try:
        conn.execute("INSERT INTO books (title, author_id) VALUES (?, ?)", (title, int(aid)))
        print(f"Добавлено: {title}")
    except sqlite3.IntegrityError:
        print(f"Ошибка: нет автора {aid}")
print("Книг:", conn.execute("SELECT COUNT(*) FROM books").fetchone()[0])
