s = input()
try:
    n = int(s)
    print(f"Число: {n}")
except ValueError:
    print("Ошибка: это не число")
