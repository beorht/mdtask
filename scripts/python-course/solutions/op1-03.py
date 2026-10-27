class Queue:
    def __init__(self):
        self.items = []

    def enqueue(self, name):
        self.items.append(name)

    def dequeue(self):
        if not self.items:
            raise IndexError("пусто")
        return self.items.pop(0)

    def __len__(self):
        return len(self.items)

    def __str__(self):
        return " <- ".join(self.items) if self.items else "(пусто)"

q = Queue()
while True:
    cmd, _, arg = input().partition(" ")
    if cmd == "стоп":
        break
    if cmd == "встать":
        q.enqueue(arg)
    elif cmd == "принять":
        try:
            print(f"Принят: {q.dequeue()}")
        except IndexError:
            print("Очередь пуста")
    elif cmd == "показать":
        print(q)
