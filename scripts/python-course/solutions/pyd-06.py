n = int(input())
code = {}
for _ in range(n):
    a, b = input().split()
    code[a] = b
result = ""
for ch in input():
    result += code.get(ch, ch)
print(result)
