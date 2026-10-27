class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def transfer(self, other, amount):
        if amount <= 0:
            raise ValueError("неверная сумма")
        if amount > self.balance:
            raise ValueError("недостаточно средств")
        self.balance -= amount
        other.balance += amount

accounts = {}
for _ in range(int(input())):
    owner, bal = input().split()
    accounts[owner] = Account(owner, int(bal))
while True:
    line = input()
    if line == "стоп":
        break
    a, b, amount = line.split()
    try:
        accounts[a].transfer(accounts[b], int(amount))
    except ValueError as e:
        print(f"Ошибка: {e}")
for name in sorted(accounts):
    print(f"{name}: {accounts[name].balance}")
