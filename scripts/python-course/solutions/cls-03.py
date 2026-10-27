class Student:
    def __init__(self, name):
        self.name = name
        self.grades = []

    def add_grade(self, g):
        self.grades.append(g)

    def average(self):
        return sum(self.grades) / len(self.grades) if self.grades else 0

n = int(input())
students = {}
for _ in range(n):
    name, g = input().split()
    if name not in students:
        students[name] = Student(name)
    students[name].add_grade(int(g))
for s in students.values():
    print(f"{s.name}: {round(s.average(), 2)}")
