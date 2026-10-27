import socket

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        text = data.decode("utf-8")
        if text.lower() == "bye":
            conn.sendall("Пока!".encode("utf-8"))
            break
        conn.sendall(f"Echo: {text.upper()}".encode("utf-8"))
    conn.close()
