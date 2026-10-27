log = []

def add(text):
    log.append(text)

def show():
    for i, text in enumerate(log, 1):
        print(f"{i}. {text}")

n = int(input())
for _ in range(n):
    add(input())
show()
