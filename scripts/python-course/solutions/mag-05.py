class Temperature:
    def __init__(self):
        self._c = 0.0

    @property
    def celsius(self):
        return self._c

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("ниже абсолютного нуля")
        self._c = value

    @property
    def fahrenheit(self):
        return self._c * 9 / 5 + 32

    @property
    def kelvin(self):
        return self._c + 273.15

t = Temperature()
for _ in range(int(input())):
    v = float(input())
    try:
        t.celsius = v
    except ValueError as e:
        print(f"Ошибка: {e}")
    else:
        print(f"C = {t.celsius}, F = {round(t.fahrenheit, 2)}, K = {round(t.kelvin, 2)}")
