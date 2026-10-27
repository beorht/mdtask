class Delivery:
    name = "Доставка"

    def __init__(self, km, kg):
        self.km = km
        self.kg = kg

    def cost(self):
        return 0

    def describe(self):
        return f"{self.name}: {self.cost()}"

class Courier(Delivery):
    name = "Курьер"

    def cost(self):
        return 15000 + 2000 * self.km

class Post(Delivery):
    name = "Почта"

    def cost(self):
        return 10000 + 3000 * self.kg

class Pickup(Delivery):
    name = "Самовывоз"

KINDS = {"courier": Courier, "post": Post, "pickup": Pickup}
items = []
for _ in range(int(input())):
    kind, km, kg = input().split()
    d = KINDS[kind](int(km), int(kg))
    items.append(d)
    print(d.describe())
best = items[0]
for d in items:
    if d.cost() < best.cost():
        best = d
print(f"Дешевле всего: {best.name}")
