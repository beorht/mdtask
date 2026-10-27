import socket
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT UNIQUE, grp TEXT)")

def base_handle(text):
    parts = text.split()
    if len(parts) == 3 and parts[0] == "REG":
        try:
            cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        except sqlite3.IntegrityError:
            return "EXISTS"
        return f"OK {cur.lastrowid}"
    if len(parts) == 2 and parts[0] == "LIST":
        names = [r[0] for r in db.execute("SELECT name FROM people WHERE grp = ? ORDER BY name", (parts[1],))]
        return ",".join(names) or "EMPTY"
    if parts == ["COUNT"]:
        return str(db.execute("SELECT COUNT(*) FROM people").fetchone()[0])
    if len(parts) == 2 and parts[0] == "DEL":
        if not parts[1].isdigit():
            return "ERROR"
        cur = db.execute("DELETE FROM people WHERE id = ?", (int(parts[1]),))
        return "DELETED" if cur.rowcount else "NOT FOUND"
    return "ERROR"

db.execute("CREATE TABLE log (id INTEGER PRIMARY KEY, client INTEGER, command TEXT)")

def handle(client, text):
    db.execute("INSERT INTO log (client, command) VALUES (?, ?)", (client, text))
    if text.strip() == "STATS":
        rows = db.execute("SELECT client, COUNT(*) FROM log GROUP BY client ORDER BY client").fetchall()
        return "; ".join(f"клиент {c}: {k} команд" for c, k in rows)
    return base_handle(text)

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
number = 0
while True:
    conn, addr = server.accept()
    number += 1
    while True:
        data = conn.recv(1024)
        if not data:
            break
        conn.sendall(handle(number, data.decode("utf-8")).encode("utf-8"))
    conn.close()
