import socket
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE contacts (name TEXT PRIMARY KEY, phone TEXT)")

def handle(text):
    p = text.split()
    if len(p) == 3 and p[0] == "ADD":
        db.execute("INSERT OR REPLACE INTO contacts VALUES (?, ?)", (p[1], p[2]))
        return "OK"
    if len(p) == 2 and p[0] == "GET":
        row = db.execute("SELECT phone FROM contacts WHERE name = ?", (p[1],)).fetchone()
        return row[0] if row else "NOT FOUND"
    if p == ["LIST"]:
        return ",".join(r[0] for r in db.execute("SELECT name FROM contacts ORDER BY name")) or "EMPTY"
    if len(p) == 2 and p[0] == "FIND":
        rows = db.execute("SELECT name, phone FROM contacts WHERE name LIKE ? ORDER BY name", (p[1] + "%",)).fetchall()
        return ",".join(f"{n}:{t}" for n, t in rows) or "NOT FOUND"
    return "ERROR"

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        conn.sendall(handle(data.decode("utf-8")).encode("utf-8"))
    conn.close()
