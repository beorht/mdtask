items = input().split()
nums = list(map(lambda s: int(s) ** 2, filter(str.isdigit, items)))
print(" ".join(map(str, nums)) if nums else "Нет чисел")
