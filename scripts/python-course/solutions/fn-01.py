def greet(name):
    print(f"Привет, {name}!")

n = int(input())
for _ in range(n):
    greet(input())
