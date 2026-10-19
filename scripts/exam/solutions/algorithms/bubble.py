# Эталон: пузырьковая сортировка с остановкой (задания 3.1–3.2 итоговой контрольной). Аргумент: asc или desc.
import sys

desc = len(sys.argv) > 1 and sys.argv[1] == "desc"
n = int(input())
records = []
for _ in range(n):
    key, value = input().split()
    records.append([key, int(value)])

passes = 0
swapped = True
while swapped:
    swapped = False
    passes += 1
    for j in range(n - 1):
        wrong = records[j][1] < records[j + 1][1] if desc else records[j][1] > records[j + 1][1]
        if wrong:
            records[j], records[j + 1] = records[j + 1], records[j]
            swapped = True

for key, value in records:
    print(key, value)
print(f"Проходов: {passes}")
