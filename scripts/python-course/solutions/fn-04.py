def powers(n, k):
    value = 1
    for i in range(1, k + 1):
        value *= n
        print(f"{n}^{i} = {value}")

powers(int(input()), int(input()))
