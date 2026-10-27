import socket
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT UNIQUE, grp TEXT)")

def handle(text):
    parts = text.split()
    if len(parts) == 3 and parts[0] == "REG":
        cur = db.execute("INSERT INTO people (name, grp) VALUES (?, ?)", (parts[1], parts[2]))
        return f"OK {cur.lastrowid}"
    if len(parts) == 2 and parts[0] == "LIST":
        names = [r[0] for r in db.execute("SELECT name FROM people WHERE grp = ? ORDER BY name", (parts[1],))]
        return ",".join(names) or "EMPTY"
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
