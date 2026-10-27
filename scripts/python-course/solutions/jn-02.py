import json
import socket

best = {}
server = socket.socket()
server.bind(("0.0.0.0", 9000))
server.listen()
while True:
    conn, addr = server.accept()
    while True:
        data = conn.recv(1024)
        if not data:
            break
        msg = json.loads(data.decode("utf-8"))
        name, score = msg["name"], msg["score"]
        if name not in best or score > best[name]:
            best[name] = score
        conn.sendall(json.dumps({"ok": True, "best": best[name], "players": len(best)}, ensure_ascii=False).encode("utf-8"))
    conn.close()
