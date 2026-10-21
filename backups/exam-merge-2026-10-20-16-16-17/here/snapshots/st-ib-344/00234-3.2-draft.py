import sys


def solve():
  # Читаем все строки из стандартного ввода
  lines = sys.stdin.readlines()
  if not lines:
    return

  # Очищаем первую строку от лишних пробелов/переводов строк
  N = int(lines[0].strip())
  data = []

  # Читаем ровно N строк с данными
  for i in range(1, N + 1):
    parts = lines[i].split()
    if len(parts) >= 2:
      client = parts[0]
      orders = int(parts[1])
      data.append([client, orders])

  passes = 0
  swapped = True

  # Пузырьковая сортировка
  while swapped:
    swapped = False
    passes += 1
    for i in range(N - 1):
      # Сравниваем по числу заказов
      if data[i][1] > data[i + 1][1]:
        # Меняем местами
        temp = data[i]
        data[i] = data[i + 1]
        data[i + 1] = temp
        swapped = True

  # Вывод отсортированных записей
  for item in data:
    print(f"{item[0]} {item[1]}")

  # Вывод количества проходов
  print(f"Проходов: {passes}")


if __name__ == "__main__":
  solve()