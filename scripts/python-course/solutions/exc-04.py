try:
    age = int(input())
except ValueError:
    print("Ошибка: введите целое число")
else:
    if age < 0 or age > 150:
        print("Ошибка: нереальный возраст")
    else:
        print(f"Через год вам будет {age + 1}")
