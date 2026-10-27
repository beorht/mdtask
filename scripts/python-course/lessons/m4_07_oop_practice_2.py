DIR = 'm4/07-oop-practice-2'
THEORY = r'''
# Практика ООП, часть 2

Задачи посложнее: наследование и полиморфизм в «живых» моделях, своя структура данных, объекты, которые взаимодействуют.

## Полиморфизм вместо if

Если в коде много `if kind == "car": … elif kind == "bus": …`, это знак, что нужны классы-наследники: каждый вид сам
знает, как посчитать стоимость, скорость, налог. Добавить новый вид — значит добавить класс, не трогая остальной код.

```python run
class Delivery:
    def cost(self, km):
        return 0

class Courier(Delivery):
    def cost(self, km):
        return 15000 + 2000 * km

class Pickup(Delivery):
    pass

for d in [Courier(), Pickup()]:
    print(type(d).__name__, d.cost(5))
```

`type(obj).__name__` — имя класса объекта.

## Своя структура данных: связный список

**Связный список** — цепочка узлов, где каждый узел хранит значение и ссылку на следующий. В отличие от списка
Python, вставка в начало занимает одно действие. Это классический пример объектов, ссылающихся на объекты.

```python run
class Node:
    def __init__(self, value, next_node=None):
        self.value = value
        self.next = next_node

head = Node(1, Node(2, Node(3)))
cur = head
while cur:
    print(cur.value)
    cur = cur.next
```

## __iter__ — объект в цикле for

Чтобы по объекту можно было пройти `for x in obj`, у класса делают метод `__iter__`. Проще всего — **генератор**:
функция с `yield` вместо `return` выдаёт значения по одному.

```python run
class Countdown:
    def __init__(self, n):
        self.n = n

    def __iter__(self):
        for i in range(self.n, 0, -1):
            yield i

print(list(Countdown(3)))
```

## Взаимодействие объектов

Перевод денег — действие сразу над двумя счетами: метод одного объекта получает другой объект параметром. Важно,
чтобы операция была «всё или ничего»: если снять не получилось, на второй счёт ничего не зачисляется.
'''
TASKS = [
    {'id': 'op2-01', 'title': 'Доставка', 'statement': 'Базовый класс Delivery(name) с методом cost(km, kg) и наследники: Courier (15000 + 2000 за км), Post (10000 + 3000 за кг), Pickup (0). Метод describe() возвращает «name: стоимость». Дано n строк «вид км кг» (courier, post, pickup) — выведите describe() для каждого, а в конце — «Дешевле всего: <name>» (при равенстве — первая из строк). Имена видов: «Курьер», «Почта», «Самовывоз».',
     'solution': 'class Delivery:\n    name = "Доставка"\n\n    def __init__(self, km, kg):\n        self.km = km\n        self.kg = kg\n\n    def cost(self):\n        return 0\n\n    def describe(self):\n        return f"{self.name}: {self.cost()}"\n\nclass Courier(Delivery):\n    name = "Курьер"\n\n    def cost(self):\n        return 15000 + 2000 * self.km\n\nclass Post(Delivery):\n    name = "Почта"\n\n    def cost(self):\n        return 10000 + 3000 * self.kg\n\nclass Pickup(Delivery):\n    name = "Самовывоз"\n\nKINDS = {"courier": Courier, "post": Post, "pickup": Pickup}\nitems = []\nfor _ in range(int(input())):\n    kind, km, kg = input().split()\n    d = KINDS[kind](int(km), int(kg))\n    items.append(d)\n    print(d.describe())\nbest = items[0]\nfor d in items:\n    if d.cost() < best.cost():\n        best = d\nprint(f"Дешевле всего: {best.name}")', 'inputs': [['3', 'courier 5 2', 'post 5 2', 'pickup 5 2'], ['2', 'post 1 1', 'courier 0 0']], 'require': ['class:Delivery', 'class:Courier', 'class:Post', 'class:Pickup']},
    {'id': 'op2-02', 'title': 'Связный список', 'statement': 'Классы Node и LinkedList: append(x) (в конец), prepend(x) (в начало), __len__, __iter__ (через yield), __str__ «a -> b -> c» (пустой — «пусто»), reverse() — развернуть на месте, меняя ссылки (без списков Python). Команды до «стоп»: «append x», «prepend x», «reverse», «print», «len».',
     'solution': 'class Node:\n    def __init__(self, value, next_node=None):\n        self.value = value\n        self.next = next_node\n\nclass LinkedList:\n    def __init__(self):\n        self.head = None\n\n    def prepend(self, x):\n        self.head = Node(x, self.head)\n\n    def append(self, x):\n        if self.head is None:\n            self.head = Node(x)\n            return\n        cur = self.head\n        while cur.next:\n            cur = cur.next\n        cur.next = Node(x)\n\n    def __iter__(self):\n        cur = self.head\n        while cur:\n            yield cur.value\n            cur = cur.next\n\n    def __len__(self):\n        n = 0\n        for _ in self:\n            n += 1\n        return n\n\n    def reverse(self):\n        prev = None\n        cur = self.head\n        while cur:\n            nxt = cur.next\n            cur.next = prev\n            prev = cur\n            cur = nxt\n        self.head = prev\n\n    def __str__(self):\n        return " -> ".join(self) if self.head else "пусто"\n\nll = LinkedList()\nwhile True:\n    cmd, _, arg = input().partition(" ")\n    if cmd == "стоп":\n        break\n    if cmd == "append":\n        ll.append(arg)\n    elif cmd == "prepend":\n        ll.prepend(arg)\n    elif cmd == "reverse":\n        ll.reverse()\n    elif cmd == "print":\n        print(ll)\n    elif cmd == "len":\n        print(len(ll))', 'inputs': [['print', 'append 2', 'append 3', 'prepend 1', 'print', 'len', 'reverse', 'print', 'стоп'], ['reverse', 'print', 'len', 'prepend x', 'reverse', 'print', 'стоп'], ['append a', 'append b', 'append c', 'append d', 'reverse', 'print', 'append e', 'print', 'len', 'стоп']], 'require': ['class:Node', 'class:LinkedList']},
    {'id': 'op2-03', 'title': 'Переводы между счетами', 'statement': 'Класс Account(owner, balance) с методом transfer(other, amount): если денег не хватает или сумма не больше нуля — исключение ValueError («недостаточно средств» / «неверная сумма»), иначе деньги переходят. Первая строка — n счетов «владелец баланс», дальше команды «владелец1 владелец2 сумма» до «стоп». На ошибку — «Ошибка: <текст>». В конце — счета по алфавиту «владелец: баланс».',
     'solution': 'class Account:\n    def __init__(self, owner, balance):\n        self.owner = owner\n        self.balance = balance\n\n    def transfer(self, other, amount):\n        if amount <= 0:\n            raise ValueError("неверная сумма")\n        if amount > self.balance:\n            raise ValueError("недостаточно средств")\n        self.balance -= amount\n        other.balance += amount\n\naccounts = {}\nfor _ in range(int(input())):\n    owner, bal = input().split()\n    accounts[owner] = Account(owner, int(bal))\nwhile True:\n    line = input()\n    if line == "стоп":\n        break\n    a, b, amount = line.split()\n    try:\n        accounts[a].transfer(accounts[b], int(amount))\n    except ValueError as e:\n        print(f"Ошибка: {e}")\nfor name in sorted(accounts):\n    print(f"{name}: {accounts[name].balance}")', 'inputs': [['2', 'Аня 100', 'Бек 50', 'Аня Бек 30', 'Бек Аня 200', 'Аня Бек -5', 'стоп'], ['3', 'Вика 0', 'Гоша 10', 'Дана 5', 'Гоша Вика 10', 'Вика Дана 10', 'Дана Гоша 16', 'стоп']], 'require': ['class:Account', 'try']},
    {'id': 'op2-04', 'title': 'Игровые персонажи', 'statement': 'Класс Character(name, hp, attack) с методом hit(other) — other.hp уменьшается на attack (не ниже 0); is_alive(). Наследники: Warrior (атака ×1), Mage (атака ×2, но после каждого удара его hp −1, если hp > 0), Healer (наносит атаку, а затем лечит себя на 3). Первые две строки — «класс имя hp атака» для двух бойцов (warrior/mage/healer). Они бьют по очереди, начиная с первого, пока один не упадёт (или 50 раундов). Выводите после каждого удара «имя1: hp1, имя2: hp2», в конце «Победил <имя>» или «Ничья».',
     'solution': 'class Character:\n    def __init__(self, name, hp, attack):\n        self.name = name\n        self.hp = hp\n        self.attack = attack\n\n    def damage(self):\n        return self.attack\n\n    def hit(self, other):\n        other.hp = max(0, other.hp - self.damage())\n        self.after_hit()\n\n    def after_hit(self):\n        pass\n\n    def is_alive(self):\n        return self.hp > 0\n\nclass Warrior(Character):\n    pass\n\nclass Mage(Character):\n    def damage(self):\n        return self.attack * 2\n\n    def after_hit(self):\n        if self.hp > 0:\n            self.hp -= 1\n\nclass Healer(Character):\n    def after_hit(self):\n        self.hp += 3\n\nKINDS = {"warrior": Warrior, "mage": Mage, "healer": Healer}\n\ndef read():\n    kind, name, hp, att = input().split()\n    return KINDS[kind](name, int(hp), int(att))\n\na, b = read(), read()\nfighters = [a, b]\nfor turn in range(50):\n    att, dfn = fighters[turn % 2], fighters[(turn + 1) % 2]\n    att.hit(dfn)\n    print(f"{a.name}: {a.hp}, {b.name}: {b.hp}")\n    if not dfn.is_alive():\n        print(f"Победил {att.name}")\n        break\n    if not att.is_alive():\n        print(f"Победил {dfn.name}")\n        break\nelse:\n    print("Ничья")', 'inputs': [['warrior Рустам 20 5', 'mage Зара 12 3'], ['healer Лекарь 10 1', 'healer Знахарь 10 1'], ['mage Ахмед 1 10', 'warrior Бобур 30 4']], 'require': ['class:Character', 'class:Warrior', 'class:Mage', 'class:Healer']},
    {'id': 'op2-05', 'title': 'Расписание', 'statement': 'Класс Event(title, day, start, end) — день 1–7, время «ЧЧ:ММ»; __lt__ для сортировки по дню и началу; метод overlaps(other) — пересекаются ли события одного дня. Класс Schedule с add(event): если событие пересекается с уже добавленным — исключение ValueError(«пересекается с <title>»). Дано n строк «название день начало конец». Выведите ошибки «Не добавлено <название>: …», затем расписание по порядку: «день начало–конец название».',
     'solution': 'def minutes(t):\n    h, m = map(int, t.split(":"))\n    return h * 60 + m\n\nclass Event:\n    def __init__(self, title, day, start, end):\n        self.title = title\n        self.day = day\n        self.start = start\n        self.end = end\n\n    def __lt__(self, o):\n        return (self.day, minutes(self.start)) < (o.day, minutes(o.start))\n\n    def overlaps(self, o):\n        return self.day == o.day and minutes(self.start) < minutes(o.end) and minutes(o.start) < minutes(self.end)\n\nclass Schedule:\n    def __init__(self):\n        self.events = []\n\n    def add(self, e):\n        for x in self.events:\n            if e.overlaps(x):\n                raise ValueError(f"пересекается с {x.title}")\n        self.events.append(e)\n\ns = Schedule()\nfor _ in range(int(input())):\n    title, day, start, end = input().split()\n    try:\n        s.add(Event(title, int(day), start, end))\n    except ValueError as e:\n        print(f"Не добавлено {title}: {e}")\nfor e in sorted(s.events):\n    print(f"{e.day} {e.start}–{e.end} {e.title}")', 'inputs': [['5', 'Физика 1 09:00 10:20', 'Химия 1 10:00 11:00', 'Python 2 13:00 14:30', 'Обед 1 10:20 11:00', 'SQL 1 08:00 09:00'], ['3', 'A 7 23:00 23:59', 'B 1 00:00 00:30', 'C 7 22:00 23:30']], 'require': ['class:Event', 'class:Schedule']},
]
