class Stack:
    def __init__(self):
        self.items = []

    def push(self, x):
        self.items.append(x)

    def pop(self):
        return self.items.pop() if self.items else None

    def peek(self):
        return self.items[-1] if self.items else None

    def is_empty(self):
        return not self.items

    def size(self):
        return len(self.items)

s = Stack()
while True:
    parts = input().split()
    if parts[0] == "стоп":
        break
    if parts[0] == "push":
        s.push(parts[1])
    elif parts[0] in ("pop", "peek"):
        r = s.pop() if parts[0] == "pop" else s.peek()
        print("пусто" if r is None else r)
    elif parts[0] == "size":
        print(s.size())
