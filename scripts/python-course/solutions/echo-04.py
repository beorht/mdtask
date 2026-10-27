import socket

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, (ip, port) = server.accept()
    print(f"Подключился {ip}:{port}")
    k = 0
    while True:
        data = conn.recv(1024)
        if not data:
            break
        k += 1
        conn.sendall(f"#{k}: {data.decode('utf-8')}".encode("utf-8"))
    print(f"Отключился, сообщений: {k}")
    conn.close()
