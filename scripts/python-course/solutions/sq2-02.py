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
for name, k in conn.execute("SELECT authors.name, COUNT(books.id) FROM authors LEFT JOIN books ON books.author_id = authors.id GROUP BY authors.id ORDER BY COUNT(books.id) DESC, authors.name"):
    print(f"{name}: {k}")
