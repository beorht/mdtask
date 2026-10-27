import socket

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
total = 0
while True:
    conn, addr = server.accept()
    mine = 0
    while True:
        data = conn.recv(1024)
        if not data:
            break
        total += 1
        mine += 1
        conn.sendall(f"Сообщение №{total} от вас №{mine}".encode("utf-8"))
    conn.close()
