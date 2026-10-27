secret = int(input())
tries = 0
while True:
    try:
        x = int(input())
    except ValueError:
        print("Это не число")
        continue
    tries += 1
    if x < secret:
        print("Больше")
    elif x > secret:
        print("Меньше")
    else:
        print(f"Угадал за {tries} попыток")
        break
