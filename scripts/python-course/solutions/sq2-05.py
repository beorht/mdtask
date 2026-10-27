import sqlite3

conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
conn.execute("CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, city TEXT)")
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    if p[0] == "add":
        cur = conn.execute("INSERT INTO contacts (name, phone, city) VALUES (?, ?, ?)", (p[1], p[2], p[3]))
        print(f"#{cur.lastrowid}")
    elif p[0] == "find":
        rows = conn.execute("SELECT * FROM contacts WHERE name LIKE ? ORDER BY name", (p[1] + "%",)).fetchall()
        if not rows:
            print("не найдено")
        for r in rows:
            print(f"{r['name']}, {r['phone']}, {r['city']}")
    elif p[0] == "city":
        names = [r["name"] for r in conn.execute("SELECT name FROM contacts WHERE city = ? ORDER BY name", (p[1],))]
        print(", ".join(names) if names else "нет")
    elif p[0] == "del":
        cur = conn.execute("DELETE FROM contacts WHERE id = ?", (int(p[1]),))
        print("удалён" if cur.rowcount else "нет такого")
