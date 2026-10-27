class Product:
    def __init__(self, name, price, stock):
        self.name = name
        self.price = price
        self.stock = stock

    def __str__(self):
        return f"{self.name} — {self.price} (осталось {self.stock})"

class Catalog:
    def __init__(self):
        self.products = {}

    def add(self, product):
        self.products[product.name] = product

    def get(self, name):
        if name not in self.products:
            raise KeyError(name)
        return self.products[name]

    def show(self):
        for name in sorted(self.products):
            print(self.products[name])

def read_catalog():
    catalog = Catalog()
    for _ in range(int(input())):
        name, price, stock = input().split()
        catalog.add(Product(name, int(price), int(stock)))
    return catalog

class Cart:
    def __init__(self, catalog):
        self.catalog = catalog
        self.items = {}

    def add(self, name, qty):
        product = self.catalog.get(name)
        if self.items.get(name, 0) + qty > product.stock:
            raise ValueError(f"на складе только {product.stock}")
        self.items[name] = self.items.get(name, 0) + qty

    def remove(self, name):
        if name not in self.items:
            raise ValueError("нет в корзине")
        del self.items[name]

    def total(self):
        return sum(self.catalog.get(n).price * q for n, q in self.items.items())

class Discount:
    def apply(self, total):
        return total

class Percent(Discount):
    def __init__(self, p):
        self.p = p

    def apply(self, total):
        return total * (100 - self.p) // 100

class Fixed(Discount):
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        return max(0, total - self.amount)

class Threshold(Discount):
    def __init__(self, limit, p):
        self.limit = limit
        self.p = p

    def apply(self, total):
        return total * (100 - self.p) // 100 if total >= self.limit else total

PROMO = {"SALE10": Percent(10), "MINUS5000": Fixed(5000), "BIG20": Threshold(100000, 20)}

cart = Cart(read_catalog())
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    cart.add(p[1], int(p[2]))
for _ in range(int(input())):
    code = input()
    if code in PROMO:
        print(f"{code}: {PROMO[code].apply(cart.total())}")
    else:
        print(f"{code}: неизвестный промокод")
