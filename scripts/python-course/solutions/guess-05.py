low, high = 1, 100
tries = 0
while True:
    mid = (low + high) // 2
    tries += 1
    print(mid)
    answer = input()
    if answer == "больше":
        low = mid + 1
    elif answer == "меньше":
        high = mid - 1
    else:
        print(f"Угадано за {tries} попыток")
        break
