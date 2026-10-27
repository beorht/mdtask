import string

p = input()
letters = digits = punct = other = 0
for ch in p:
    if ch in string.ascii_letters:
        letters += 1
    elif ch in string.digits:
        digits += 1
    elif ch in string.punctuation:
        punct += 1
    else:
        other += 1
print(f"Букв: {letters}")
print(f"Цифр: {digits}")
print(f"Знаков: {punct}")
print(f"Других: {other}")
