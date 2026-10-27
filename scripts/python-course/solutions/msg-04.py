import socket
import sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE messages (id INTEGER PRIMARY KEY, author TEXT, text TEXT, recipient TEXT)")

def lines(rows, prefix=""):
    return "\n".join(f"{prefix}{a}: {t}" for a, t in rows) or "EMPTY"

def handle(user, text):
    parts = text.split(" ", 1)
    cmd = parts[0]
    arg = parts[1] if len(parts) > 1 else ""
    if cmd == "LOGIN" and arg:
        return arg, f"WELCOME {arg}"
    if user is None:
        return user, "ERROR: login first"
    if cmd == "SAY" and arg:
        db.execute("INSERT INTO messages (author, text) VALUES (?, ?)", (user, arg))
        return user, "OK"
    if cmd == "HISTORY":
        return user, lines(db.execute("SELECT author, text FROM messages WHERE recipient IS NULL ORDER BY id"))
    if cmd == "LAST" and arg.isdigit():
        rows = db.execute("SELECT author, text FROM messages WHERE recipient IS NULL ORDER BY id DESC LIMIT ?", (int(arg),)).fetchall()
        return user, lines(rows[::-1])
    if cmd == "TO":
        to = arg.split(" ", 1)
        if len(to) == 2:
            db.execute("INSERT INTO messages (author, text, recipient) VALUES (?, ?, ?)", (user, to[1], to[0]))
            return user, "OK"
    if cmd == "INBOX":
        return user, lines(db.execute("SELECT author, text FROM messages WHERE recipient = ? ORDER BY id", (user,)), "от ")
    return user, "ERROR"

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    user = None
    while True:
        data = conn.recv(1024)
        if not data:
            break
        user, reply = handle(user, data.decode("utf-8"))
        conn.sendall(reply.encode("utf-8"))
    conn.close()
