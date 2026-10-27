class Stack:
    def __init__(self):
        self.items = []

    def push(self, x):
        self.items.append(x)

    def pop(self):
        return self.items.pop() if self.items else None

    def is_empty(self):
        return not self.items

PAIRS = {")": "(", "]": "[", "}": "{"}

def balanced(s):
    st = Stack()
    for ch in s:
        if ch in "([{":
            st.push(ch)
        elif ch in PAIRS:
            if st.pop() != PAIRS[ch]:
                return False
    return st.is_empty()

n = int(input())
for _ in range(n):
    print("Да" if balanced(input()) else "Нет")
