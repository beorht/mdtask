calls = 0

def hello():
    global calls
    print("Привет!")
    calls += 1

n = int(input())
for _ in range(n):
    hello()
print(f"Вызовов: {calls}")
