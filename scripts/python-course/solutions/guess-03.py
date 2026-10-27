secret = int(input())
for tries in range(1, 8):
    x = int(input())
    if x < secret:
        print("Больше")
    elif x > secret:
        print("Меньше")
    else:
        print(f"Угадал за {tries} попыток")
        break
else:
    print(f"Вы проиграли. Было загадано {secret}")
