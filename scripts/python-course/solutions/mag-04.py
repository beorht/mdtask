class Cart:
    def __init__(self):
        self.items = {}

    def add(self, name, price):
        self.items[name] = price

    def __len__(self):
        return len(self.items)

    def __contains__(self, name):
        return name in self.items

    @property
    def total(self):
        return sum(self.items.values())

cart = Cart()
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    if p[0] == "add":
        cart.add(p[1], int(p[2]))
    elif p[0] == "has":
        print("Да" if p[1] in cart else "Нет")
    elif p[0] == "len":
        print(len(cart))
    elif p[0] == "total":
        print(cart.total)
