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

res = fizzbuzz(int(input()))
c = {"Fizz": 0, "Buzz": 0, "FizzBuzz": 0}
nums = 0
for w in res:
    if w in c:
        c[w] += 1
    else:
        nums += 1
for k, v in c.items():
    print(f"{k}: {v}")
print(f"Чисел: {nums}")
