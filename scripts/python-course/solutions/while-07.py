n = int(input())
if n == 0:
    print(0)
else:
    digits = ""
    while n > 0:
        digits = str(n % 2) + digits
        n //= 2
    print(digits)
