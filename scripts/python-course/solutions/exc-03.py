word = input()
try:
    i = int(input())
    print(word[i])
except ValueError:
    print("Ошибка ввода")
except IndexError:
    print("Нет такой позиции")
