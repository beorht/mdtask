def row(n, start):
    other = "." if start == "#" else "#"
    s = ""
    for i in range(n):
        s += start if i % 2 == 0 else other
    print(s)

n = int(input())
for r in range(n):
    row(n, "#" if r % 2 == 0 else ".")
