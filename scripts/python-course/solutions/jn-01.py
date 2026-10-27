import json
import socket

with socket.socket() as s:
    s.connect(("192.168.1.10", 7002))
    while True:
        line = input()
        if line == "конец":
            break
        a, op, b = line.split()
        s.sendall(json.dumps({"op": op, "a": float(a), "b": float(b)}).encode("utf-8"))
        reply = json.loads(s.recv(1024).decode("utf-8"))
        if "result" in reply:
            print(f"{line} = {reply['result']}")
        else:
            print(f"{line}: ошибка — {reply['error']}")
