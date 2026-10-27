DIR = 'm4/08-oop-project'
THEORY = r'''
# Мини-проект ООП: интернет-магазин

Соберём модель магазина из нескольких классов, которые работают вместе. Это и есть объектно-ориентированное
проектирование: разбить предметную область на объекты с понятными обязанностями.

## Классы проекта

| Класс | Отвечает за |
| --- | --- |
| `Product` | товар: название, цена, остаток на складе |
| `Catalog` | набор товаров: добавить, найти, показать |
| `Cart` | корзина покупателя: позиции и количество, сумма |
| `Discount` и наследники | правила скидок (промокоды) |
| `Order` | оформленный заказ: что купили, за сколько |
| `Shop` | связывает всё: принимает команды |

## Правила, которые нельзя нарушить

- нельзя положить в корзину больше, чем есть на складе;
- при оформлении заказа остатки на складе уменьшаются, корзина очищается;
- скидка не делает сумму отрицательной.

Каждое правило проверяет тот класс, которому принадлежат данные: склад — `Product`, корзина — `Cart`.

## Скидки через полиморфизм

```python run
class Discount:
    def apply(self, total):
        return total

class Percent(Discount):
    def __init__(self, p):
        self.p = p

    def apply(self, total):
        return total - total * self.p // 100

print(Percent(10).apply(50000))
```

Магазин хранит словарь «промокод → объект скидки» и вызывает `apply`, не зная, какая именно скидка внутри.

## Работайте по шагам

Задачи проекта идут по нарастающей: каждая следующая добавляет класс или возможность к предыдущей. Код прошлой задачи
можно взять за основу — дописывайте, а не переписывайте с нуля.
'''
BASE = '''class Product:
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
'''
CART = '''
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
'''
DISC = '''
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
'''
CAT = ['3', 'чай 20000 5', 'кофе 45000 2', 'торт 85000 1']
TASKS = [
    {'id': 'shop-01', 'title': 'Каталог', 'statement': 'Классы Product(name, price, stock) с __str__ «name — price (осталось stock)» и Catalog с add(product), get(name) (нет товара — KeyError) и show() (товары по алфавиту). Дано n строк «название цена остаток», затем запросы до «стоп»: название — вывести товар или «Нет товара: название». В конце — show().',
     'solution': BASE + '\ncatalog = read_catalog()\nwhile True:\n    q = input()\n    if q == "стоп":\n        break\n    try:\n        print(catalog.get(q))\n    except KeyError:\n        print(f"Нет товара: {q}")\ncatalog.show()', 'inputs': [CAT + ['кофе', 'сок', 'стоп'], ['2', 'б 1 1', 'а 2 0', 'а', 'стоп']], 'require': ['class:Product', 'class:Catalog']},
    {'id': 'shop-02', 'title': 'Корзина', 'statement': 'Добавьте класс Cart(catalog): add(name, qty) — нельзя положить больше остатка (ValueError «на складе только N»), remove(name) (ValueError «нет в корзине»), total(). Каталог как в прошлой задаче, затем команды до «стоп»: «add товар кол-во», «remove товар», «total». На ошибки — «Ошибка: <текст>», нет товара в каталоге — «Ошибка: нет товара».',
     'solution': BASE + CART + '\ncart = Cart(read_catalog())\nwhile True:\n    p = input().split()\n    if p[0] == "стоп":\n        break\n    try:\n        if p[0] == "add":\n            cart.add(p[1], int(p[2]))\n        elif p[0] == "remove":\n            cart.remove(p[1])\n        elif p[0] == "total":\n            print(cart.total())\n    except KeyError:\n        print("Ошибка: нет товара")\n    except ValueError as e:\n        print(f"Ошибка: {e}")', 'inputs': [CAT + ['add чай 2', 'add кофе 3', 'add кофе 2', 'total', 'remove торт', 'add сок 1', 'remove чай', 'total', 'стоп'], CAT + ['add чай 3', 'add чай 3', 'add чай 2', 'total', 'стоп']], 'require': ['class:Cart']},
    {'id': 'shop-03', 'title': 'Промокоды', 'statement': 'Добавьте скидки: базовый Discount.apply(total) и наследники Percent(p) — минус p% (целочисленно), Fixed(amount) — минус сумма, не ниже 0, Threshold(limit, p) — минус p%, только если сумма не меньше limit. Промокоды: SALE10 = Percent(10), MINUS5000 = Fixed(5000), BIG20 = Threshold(100000, 20). После каталога и строки «add …» команд до «стоп» — дано k промокодов; для каждого выведите «код: сумма со скидкой» или «код: неизвестный промокод».',
     'solution': BASE + CART + DISC + '\ncart = Cart(read_catalog())\nwhile True:\n    p = input().split()\n    if p[0] == "стоп":\n        break\n    cart.add(p[1], int(p[2]))\nfor _ in range(int(input())):\n    code = input()\n    if code in PROMO:\n        print(f"{code}: {PROMO[code].apply(cart.total())}")\n    else:\n        print(f"{code}: неизвестный промокод")', 'inputs': [CAT + ['add чай 1', 'add торт 1', 'стоп', '4', 'SALE10', 'MINUS5000', 'BIG20', 'FREE'], CAT + ['add чай 1', 'стоп', '2', 'BIG20', 'MINUS5000']], 'require': ['class:Discount', 'class:Percent', 'class:Fixed', 'class:Threshold']},
    {'id': 'shop-04', 'title': 'Оформление заказа', 'statement': 'Добавьте класс Order(number, items, total) и в магазине метод checkout(cart, code): сумма с промокодом (или без, если код «-»), остатки на складе уменьшаются, корзина очищается, заказ сохраняется. Команды до «стоп»: «add товар кол-во», «checkout код» (вывести «Заказ №k: сумма»; пустая корзина — «Корзина пуста»), «stock» — show() каталога, «orders» — «№k: сумма» по всем заказам и «Выручка: …».',
     'solution': BASE + CART + DISC + '''
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
''', 'inputs': [CAT + ['checkout -', 'add чай 2', 'add кофе 1', 'checkout SALE10', 'add торт 1', 'checkout MINUS5000', 'add торт 1', 'stock', 'orders', 'стоп'], CAT + ['add кофе 2', 'add торт 1', 'checkout BIG20', 'orders', 'стоп']], 'require': ['class:Order', 'class:Shop']},
    {'id': 'shop-05', 'title': 'Отчёт о продажах', 'statement': 'По той же модели магазина: после каталога идут заказы — каждый заказ это строки «add товар кол-во» и затем «checkout код»; ввод заканчивается строкой «стоп». Выведите отчёт: для каждого проданного товара по алфавиту «товар: продано k шт.», затем «Хит продаж: <товар>» (больше всего штук; при равенстве — первый по алфавиту), затем «Заказов: n, выручка: s».',
     'solution': BASE + CART + DISC + '''
sold = {}
catalog = read_catalog()
cart = Cart(catalog)
orders = []
while True:
    p = input().split()
    if p[0] == "стоп":
        break
    if p[0] == "add":
        cart.add(p[1], int(p[2]))
    else:
        total = cart.total()
        if p[1] != "-":
            total = PROMO[p[1]].apply(total)
        for name, qty in cart.items.items():
            catalog.get(name).stock -= qty
            sold[name] = sold.get(name, 0) + qty
        orders.append(total)
        cart.items = {}
for name in sorted(sold):
    print(f"{name}: продано {sold[name]} шт.")
best = None
for name in sorted(sold):
    if best is None or sold[name] > sold[best]:
        best = name
print(f"Хит продаж: {best}")
print(f"Заказов: {len(orders)}, выручка: {sum(orders)}")
''', 'inputs': [CAT + ['add чай 2', 'add кофе 1', 'checkout SALE10', 'add чай 1', 'add торт 1', 'checkout -', 'стоп'], CAT + ['add кофе 2', 'checkout MINUS5000', 'add чай 2', 'checkout -', 'стоп']], 'require': ['class:Cart', 'class:Discount']},
]
