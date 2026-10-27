class Node:
    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node

class LinkedList:
    def __init__(self):
        self.head = None

    def prepend(self, x):
        self.head = Node(x, self.head)

    def append(self, x):
        if self.head is None:
            self.head = Node(x)
            return
        cur = self.head
        while cur.next:
            cur = cur.next
        cur.next = Node(x)

    def __iter__(self):
        cur = self.head
        while cur:
            yield cur.value
            cur = cur.next

    def __len__(self):
        n = 0
        for _ in self:
            n += 1
        return n

    def reverse(self):
        prev = None
        cur = self.head
        while cur:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        self.head = prev

    def __str__(self):
        return " -> ".join(self) if self.head else "пусто"

ll = LinkedList()
while True:
    cmd, _, arg = input().partition(" ")
    if cmd == "стоп":
        break
    if cmd == "append":
        ll.append(arg)
    elif cmd == "prepend":
        ll.prepend(arg)
    elif cmd == "reverse":
        ll.reverse()
    elif cmd == "print":
        print(ll)
    elif cmd == "len":
        print(len(ll))
