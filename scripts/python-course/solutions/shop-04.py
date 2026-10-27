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

class Order:
    def __init__(self, number, items, total):
        self.number = number
        self.items = items
        self.total = total

class Shop:
    def __init__(self, catalog):
        self.catalog = catalog
        self.cart = Cart(catalog)
        self.orders = []

    def checkout(self, code):
        if not self.cart.items:
            raise ValueError("Корзина пуста")
        total = self.cart.total()
        if code != "-":
            total = PROMO[code].apply(total)
        for name, qty in self.cart.items.items():
            self.catalog.get(name).stock -= qty
        order = Order(len(self.orders) + 1, dict(self.cart.items), total)
        self.orders.append(order)
        self.cart.items = {}
        return order

shop = Shop(read_catalog())
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    try:
        if p[0] == "add":
            shop.cart.add(p[1], int(p[2]))
        elif p[0] == "checkout":
            o = shop.checkout(p[1])
            print(f"Заказ №{o.number}: {o.total}")
        elif p[0] == "stock":
            shop.catalog.show()
        elif p[0] == "orders":
            for o in shop.orders:
                print(f"№{o.number}: {o.total}")
            print(f"Выручка: {sum(o.total for o in shop.orders)}")
    except ValueError as e:
        print(e)
