import json
import socket

book = {}

def answer(text):
    try:
        req = json.loads(text)
        cmd = req["cmd"]
        if cmd == "add":
            book[req["name"]] = req["phone"]
            return {"ok": True}
        if cmd == "get":
            if req["name"] in book:
                return {"ok": True, "phone": book[req["name"]]}
            return {"ok": False, "error": "not found"}
        if cmd == "list":
            return {"ok": True, "names": sorted(book)}
    except (ValueError, KeyError, TypeError):
        pass
    return {"ok": False, "error": "bad request"}

def handle(text):
    return json.dumps(answer(text), ensure_ascii=False)

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
