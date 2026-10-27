import json
import socket

ok_sum = 0
ok_count = 0
errors = []
n = int(input())
with socket.socket() as s:
    s.connect(("192.168.1.10", 7002))
    for i in range(1, n + 1):
        a, op, b = input().split()
        s.sendall(json.dumps({"op": op, "a": float(a), "b": float(b)}).encode("utf-8"))
        r = json.loads(s.recv(1024).decode("utf-8"))
        if "result" in r:
            ok_sum += r["result"]
            ok_count += 1
        else:
            errors.append(f"№{i}: {r['error']}")
print(f"Успешно: {ok_count}")
print(f"Сумма: {round(ok_sum, 2)}")
for e in errors:
    print(e)
