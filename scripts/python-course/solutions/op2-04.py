class Character:
    def __init__(self, name, hp, attack):
        self.name = name
        self.hp = hp
        self.attack = attack

    def damage(self):
        return self.attack

    def hit(self, other):
        other.hp = max(0, other.hp - self.damage())
        self.after_hit()

    def after_hit(self):
        pass

    def is_alive(self):
        return self.hp > 0

class Warrior(Character):
    pass

class Mage(Character):
    def damage(self):
        return self.attack * 2

    def after_hit(self):
        if self.hp > 0:
            self.hp -= 1

class Healer(Character):
    def after_hit(self):
        self.hp += 3

KINDS = {"warrior": Warrior, "mage": Mage, "healer": Healer}

def read():
    kind, name, hp, att = input().split()
    return KINDS[kind](name, int(hp), int(att))

a, b = read(), read()
fighters = [a, b]
for turn in range(50):
    att, dfn = fighters[turn % 2], fighters[(turn + 1) % 2]
    att.hit(dfn)
    print(f"{a.name}: {a.hp}, {b.name}: {b.hp}")
    if not dfn.is_alive():
        print(f"Победил {att.name}")
        break
    if not att.is_alive():
        print(f"Победил {dfn.name}")
        break
else:
    print("Ничья")
