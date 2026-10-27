import json
import socket

def calc(text):
    try:
        req = json.loads(text)
        a, b, op = req["a"], req["b"], req["op"]
        if op == "+":
            return {"result": a + b}
        if op == "-":
            return {"result": a - b}
        if op == "*":
            return {"result": a * b}
        if op == "/":
            if b == 0:
                return {"error": "деление на ноль"}
            return {"result": a / b}
        return {"error": "неизвестная операция"}
    except (ValueError, KeyError, TypeError):
        return {"error": "неверный запрос"}

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        conn.sendall(json.dumps(calc(data.decode("utf-8")), ensure_ascii=False).encode("utf-8"))
    conn.close()
