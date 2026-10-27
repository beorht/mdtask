import socket

def handle(msg):
    parts = msg.split()
    if parts == ["PING"]:
        return "PONG"
    if len(parts) == 3 and parts[0] in ("ADD", "MUL"):
        try:
            a, b = int(parts[1]), int(parts[2])
        except ValueError:
            return "ERROR"
        return str(a + b if parts[0] == "ADD" else a * b)
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
