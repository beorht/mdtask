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

cart = Cart(read_catalog())
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    try:
        if p[0] == "add":
            cart.add(p[1], int(p[2]))
        elif p[0] == "remove":
            cart.remove(p[1])
        elif p[0] == "total":
            print(cart.total())
    except KeyError:
        print("Ошибка: нет товара")
    except ValueError as e:
        print(f"Ошибка: {e}")
