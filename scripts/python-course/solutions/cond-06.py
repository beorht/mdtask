a = int(input())
b = int(input())
c = int(input())
if a >= b + c or b >= a + c or c >= a + b:
    print("Не существует")
elif a == b == c:
    print("Равносторонний")
elif a == b or b == c or a == c:
    print("Равнобедренный")
else:
    print("Разносторонний")
