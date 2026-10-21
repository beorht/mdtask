import sys


def solve():
  # Считываем все входные данные из стандартного ввода
  input_data = sys.stdin.read().split()
  if not input_data:
    return

  N = int(input_data[0])
  data = []
  idx = 1
  for _ in range(N):
    client = input_data[idx]
    orders = int(input_data[idx + 1])
    data.append([client, orders])
    idx += 2

  passes = 0
  swapped = True

  # Реализация пузырьковой сортировки вручную
  while swapped:
    swapped = False
    passes += 1
    for i in range(N - 1):
      # Сравниваем соседние элементы по количеству заказов (индекс 1)
      if data[i][1] > data[i + 1][1]:
        # Меняем элементы местами
        temp = data[i]
        data[i] = data[i + 1]
        data[i + 1] = temp
        swapped = True

  # Вывод результатов в требуемом формате
  for item in data:
    print(f"{item[0]} {item[1]}")

  # Вывод количества проходов (включая последний без обменов)
  print(f"Проходов: {passes}")


if __name__ == "__main__":
  solve()