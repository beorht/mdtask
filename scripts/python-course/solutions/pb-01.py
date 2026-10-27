import socket

with socket.socket() as s:
    s.connect(("192.168.1.10", 7003))
    while True:
        cmd = input()
        if cmd == "конец":
            break
        s.sendall(cmd.encode("utf-8"))
        print(f"{cmd} => {s.recv(1024).decode('utf-8')}")
