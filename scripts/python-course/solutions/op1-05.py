class Matrix:
    def __init__(self, rows):
        self.rows = rows
        self.r = len(rows)
        self.c = len(rows[0])

    def __add__(self, o):
        if (self.r, self.c) != (o.r, o.c):
            raise ValueError("размеры")
        return Matrix([[self.rows[i][j] + o.rows[i][j] for j in range(self.c)] for i in range(self.r)])

    def __mul__(self, o):
        if self.c != o.r:
            raise ValueError("размеры")
        return Matrix([[sum(self.rows[i][k] * o.rows[k][j] for k in range(self.c)) for j in range(o.c)] for i in range(self.r)])

    def __str__(self):
        return "\n".join(" ".join(map(str, row)) for row in self.rows)

def read():
    r, c = map(int, input().split())
    return Matrix([list(map(int, input().split())) for _ in range(r)])

a = read()
b = read()
try:
    print(a + b)
except ValueError:
    print("нельзя сложить")
print("---")
try:
    print(a * b)
except ValueError:
    print("нельзя умножить")
