import socket

name = socket.gethostname()
ip = socket.gethostbyname(name)
print(f"Имя: {name}")
print(f"Адрес: {ip}")
with socket.socket() as s:
    s.connect((ip, 7000))
    s.sendall(f"Я — {name}".encode("utf-8"))
    print(s.recv(1024).decode("utf-8"))
