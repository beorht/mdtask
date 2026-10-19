# Эталон: сортировка выбором (задания 3.1–3.2 итоговой контрольной). Аргумент: asc или desc.
import sys

desc = len(sys.argv) > 1 and sys.argv[1] == "desc"
n = int(input())
records = []
for _ in range(n):
    key, value = input().split()
    records.append([key, int(value)])

swaps = 0
for i in range(n - 1):
    best = i
    for j in range(i + 1, n):
        if (records[j][1] > records[best][1]) if desc else (records[j][1] < records[best][1]):
            best = j
    if best != i:
        records[i], records[best] = records[best], records[i]
        swaps += 1

for key, value in records:
    print(key, value)
print(f"Обменов: {swaps}")
