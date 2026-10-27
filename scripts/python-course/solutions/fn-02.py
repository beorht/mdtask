def line(symbol, n):
    print(symbol * n)

ch = input()
k = int(input())
for i in range(1, k + 1):
    line(ch, i)
