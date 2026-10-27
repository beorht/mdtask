BLACKLIST = {"password", "qwerty", "123456", "12345678", "admin", "letmein"}

def has_triple(p):
    for i in range(len(p) - 2):
        if p[i] == p[i + 1] == p[i + 2]:
            return True
    return False

n = int(input())
for _ in range(n):
    p = input()
    if p.lower() in BLACKLIST:
        print("из списка")
    elif has_triple(p):
        print("повтор")
    else:
        print("ок")
