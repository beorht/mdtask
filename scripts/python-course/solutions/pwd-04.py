REPL = {"а": "@", "о": "0", "и": "1", "е": "3", "с": "$"}

words = input().split()
letters = [w[0].lower() for w in words]
letters[0] = letters[0].upper()
result = "".join(REPL.get(ch, ch) for ch in letters)
print(result + str(len(words)))
