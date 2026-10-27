import socket

def ask(s, cmd):
    s.sendall(cmd.encode("utf-8"))
    return s.recv(1024).decode("utf-8")

with socket.socket() as s:
    s.connect(("192.168.1.10", 7003))
    ok = 0
    for _ in range(int(input())):
        ok += ask(s, "ADD " + input()) == "OK"
    print(f"Добавлено: {ok}")
    print(f"В справочнике: {ask(s, 'LIST')}")
    for name in input().split():
        r = ask(s, "GET " + name)
        print(f"{name}: {'нет' if r == 'NOT FOUND' else r}")
