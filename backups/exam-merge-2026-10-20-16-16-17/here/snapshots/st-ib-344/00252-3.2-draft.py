
def solve():
    n = int(input())
    data = []

    for _ in range(n):
        client, orders = input().split()
        data.append([client, int(orders)])

    passes = 0

    while True:
        swapped = False

        for i in range(n - 1):
            if data[i][1] > data[i + 1][1]:
                data[i], data[i + 1] = data[i + 1], data[i]
                swapped = True

        passes += 1

        if not swapped:
            break

    for item in data:
        print(f"{item[0]} {item[1]}")

    print(f"Проходов: {passes}")


if __name__ == "__main__":
    solve()
