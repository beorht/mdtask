def mask(word, opened):
    return " ".join(ch if ch in opened else "_" for ch in word)

word = input()
print(mask(word, set(input())))
