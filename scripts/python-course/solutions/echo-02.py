import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(("192.168.1.10", 7001))
    replies = []
    total = 0
    for word in input().split():
        s.sendall(word.encode("utf-8"))
        data = s.recv(1024)
        total += len(data)
        replies.append(data.decode("utf-8"))
print(" ".join(replies))
print(total)
