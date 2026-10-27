import socket

QUESTIONS = [("2+2?", "4"), ("Столица Узбекистана?", "Ташкент"), ("7*8?", "56")]
server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    score = 0
    for i, (q, a) in enumerate(QUESTIONS):
        conn.sendall(q.encode("utf-8"))
        data = conn.recv(1024)
        if not data:
            break
        if data.decode("utf-8").strip() == a:
            score += 1
            conn.sendall("Верно!".encode("utf-8"))
        else:
            conn.sendall(f"Неверно, ответ: {a}".encode("utf-8"))
    else:
        conn.sendall(f"Счёт: {score}/3".encode("utf-8"))
    conn.close()
