def read():
    prices = {}
    for _ in range(int(input())):
        name, p = input().split()
        prices[name] = int(p)
    return prices

old = read()
new = read()
for name, p in old.items():
    if name not in new:
        print(f"{name}: цены больше нет")
    elif new[name] == p:
        print(f"{name}: 0 (не изменилась)")
    else:
        print(f"{name}: {new[name] - p:+d}")
