import socket

with socket.socket() as s:
    s.connect(("192.168.1.10", 7004))
    name = input()
    sent = 0
    while True:
        text = input()
        if text == "конец":
            break
        s.sendall(f"SEND {name} {text}".encode("utf-8"))
        s.recv(1024)
        sent += 1
    s.sendall("HISTORY".encode("utf-8"))
    print(s.recv(1024).decode("utf-8"))
print(f"Отправлено: {sent}")
