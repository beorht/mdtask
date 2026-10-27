balance = 0

def deposit(x):
    global balance
    balance += x

def withdraw(x):
    global balance
    if x > balance:
        print("Недостаточно средств")
    else:
        balance -= x

while True:
    cmd = input()
    if cmd == "стоп":
        break
    if cmd[0] == "+":
        deposit(int(cmd[1:]))
    else:
        withdraw(int(cmd[1:]))
print(f"Баланс: {balance}")
