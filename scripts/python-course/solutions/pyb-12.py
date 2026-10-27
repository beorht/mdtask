import time

n = int(input())
start = time.perf_counter()
loop_sum = 0
for k in range(1, n + 1):
    loop_sum += k
loop_time = time.perf_counter() - start
start = time.perf_counter()
formula_sum = n * (n + 1) // 2
formula_time = time.perf_counter() - start
print(f"Цикл: {loop_sum}")
print(f"Формула: {formula_sum}")
print("Формула быстрее: " + ("да" if formula_time < loop_time else "нет"))
