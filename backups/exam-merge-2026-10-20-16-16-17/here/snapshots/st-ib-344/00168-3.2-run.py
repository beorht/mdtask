import sys


def main():
  # Чтение всех данных из стандартного ввода
  input_data = sys.stdin.read().splitlines()
  if not input_data:
    return

  N = int(input_data[0])
  data = []

  # Заполняем список кортежами (номер_клиента, число_заказов)
  for i in range(1, N + 1):
    parts = input_data[i].split()
    client = parts[0]
    orders = int(parts[1])
    data.append((client, orders))

  passes = 0
  n = len(data)

  # Алгоритм «пузырьковая сортировка»
  while True:
    passes += 1
    swapped = False
    for i in range(n - 1):
      # Сравниваем соседние записи по числу заказов (по возрастанию)
      if data[i][1] > data[i + 1][1]:
        # Меняем местами
        data[i], data[i + 1] = data[i + 1], data[i]
        swapped = True

    # Если за проход не было ни одного обмена, останавливаемся
    if not swapped:
      break

  # Вывод отсортированных данных
  for client, orders in data:
    print(f"{client} {orders}")

  # Вывод общего числа проходов (включая последний без обменов)
  print(f"Проходов: {passes}")


if __name__ == "__main__":
  main()