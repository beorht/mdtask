n = int(input())
a = int(input())
b = int(input())
out = []
for i in range(1, n + 1):
    word = ("Fizz" if i % a == 0 else "") + ("Buzz" if i % b == 0 else "")
    out.append(word or str(i))
print(" ".join(out))
