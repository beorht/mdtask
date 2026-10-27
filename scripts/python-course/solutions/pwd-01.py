import string

BLACKLIST = {"password", "qwerty", "123456", "12345678", "admin", "letmein"}

def problems(p):
    found = []
    if len(p) < 8:
        found.append("короче 8 символов")
    if not any(c in string.ascii_lowercase for c in p):
        found.append("нет маленьких букв")
    if not any(c in string.ascii_uppercase for c in p):
        found.append("нет больших букв")
    if not any(c in string.digits for c in p):
        found.append("нет цифр")
    if not any(c in string.punctuation for c in p):
        found.append("нет спецсимволов")
    return found

p = input()
found = problems(p)
if found:
    print("Ненадёжный:")
    for f in found:
        print(f)
else:
    print("Надёжный")
