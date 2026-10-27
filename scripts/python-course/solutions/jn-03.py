import json
import socket

best = {}

def handle(text):
    try:
        msg = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "bad json"}
    if not isinstance(msg, dict) or not isinstance(msg.get("name"), str) or not isinstance(msg.get("score"), int):
        return {"error": "bad request"}
    name, score = msg["name"], msg["score"]
    if name not in best or score > best[name]:
        best[name] = score
    return {"ok": True, "best": best[name], "players": len(best)}

server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        conn.sendall(json.dumps(handle(data.decode("utf-8")), ensure_ascii=False).encode("utf-8"))
    conn.close()
