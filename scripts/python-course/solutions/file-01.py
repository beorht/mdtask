with open("text.txt", encoding="utf-8") as f:
    lines = f.read().splitlines()
print(f"Строк: {len(lines)}")
print(f"Слов: {sum(len(l.split()) for l in lines)}")
print(f"Символов: {sum(len(l) for l in lines)}")
