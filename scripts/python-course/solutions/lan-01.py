import socket

host = input()
opened = 0
for port in map(int, input().split()):
    s = socket.socket()
    try:
        s.connect((host, port))
        print(f"{port}: открыт")
        opened += 1
    except ConnectionRefusedError:
        print(f"{port}: закрыт")
    finally:
        s.close()
print(f"Открытых: {opened}")
