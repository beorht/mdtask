def log(func):
    def wrapper(*args):
        print(f"-> {func.__name__}({', '.join(map(str, args))})")
        result = func(*args)
        print(f"<- {result}")
        return result
    return wrapper

@log
def add(a, b):
    return a + b

@log
def greet(name):
    return f"Привет, {name}"

n = int(input())
for _ in range(n):
    parts = input().split()
    if parts[0] == "add":
        add(int(parts[1]), int(parts[2]))
    else:
        greet(parts[1])
