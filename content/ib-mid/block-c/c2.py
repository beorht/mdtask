# Движение средств по счёту.
# Ввод: первая строка — число операций N; далее N строк «in СУММА» (пополнение)
# или «out СУММА» (списание). Вывод: «Итог: B» (конечный баланс),
# «Минимум: M» (наименьший баланс за историю), «В минусе раз: K»
# (сколько раз баланс был СТРОГО отрицательным), «Крупнейшее списание: D».

def parse(n):
    ops = []
    for _ in range(n):
        parts = input().split()
        op = parts[0]
        amount = int(parts[1])
        ops.append((op, amount))
    return ops

def run(ops):
    balance = 0
    history = []
    for op, amount in ops:
        if op == "in":
            balance += amount
        else:
            balance -= amount
        history.append(balance)
    return history

def count_negative(history):
    neg = 0
    for b in history:
        # строго отрицательный баланс (ноль не считаем)
        if b <= 0:
            neg += 1
    return neg

def biggest_withdrawal(ops):
    best = 0
    for op, amount in ops:
        if op == "out" and amount > best:
            best = amount
    return best

def main():
    n = int(input())
    ops = parse(n)
    history = run(ops)
    print("Итог:", history[-1] if history else 0)
    print("Минимум:", min(history) if history else 0)
    print("В минусе раз:", count_negative(history))
    print("Крупнейшее списание:", biggest_withdrawal(ops))

main()
