import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(("192.168.1.10", 7000))
    while True:
        msg = input()
        if msg == "конец":
            break
        s.sendall(msg.encode("utf-8"))
        print(f"-> {msg}")
        print(f"<- {s.recv(1024).decode('utf-8')}")
