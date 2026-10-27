class BankAccount:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0

    def deposit(self, x):
        self.balance += x

    def withdraw(self, x):
        if x > self.balance:
            return False
        self.balance -= x
        return True

acc = BankAccount(input())
while True:
    cmd = input()
    if cmd == "стоп":
        break
    if cmd[0] == "+":
        acc.deposit(int(cmd[1:]))
    elif not acc.withdraw(int(cmd[1:])):
        print("Отказ")
print(f"{acc.owner}: {acc.balance}")
