def fizzbuzz(n):
    result = []
    for i in range(1, n + 1):
        word = ""
        if i % 3 == 0:
            word += "Fizz"
        if i % 5 == 0:
            word += "Buzz"
        result.append(word or str(i))
    return result

print(", ".join(fizzbuzz(int(input()))))
