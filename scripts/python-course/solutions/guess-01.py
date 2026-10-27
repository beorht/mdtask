secret = int(input())
x = int(input())
if x < secret:
    print("Больше")
elif x > secret:
    print("Меньше")
else:
    print("Угадал!")
