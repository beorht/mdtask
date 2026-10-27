def is_palindrome(text):
    s = text.replace(" ", "").lower()
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True

n = int(input())
for _ in range(n):
    print("Да" if is_palindrome(input()) else "Нет")
