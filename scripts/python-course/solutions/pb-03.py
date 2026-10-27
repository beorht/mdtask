import socket

book = {}

def handle(text):
    p = text.split()
    if len(p) == 3 and p[0] == "ADD":
        book[p[1]] = p[2]
        return "OK"
    if len(p) == 2 and p[0] == "GET":
        return book.get(p[1], "NOT FOUND")
    if p == ["LIST"]:
        return ",".join(sorted(book)) or "EMPTY"
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
