class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def monthly(self):
        return self.salary

class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)
        self.bonus = bonus

    def monthly(self):
        return super().monthly() + self.bonus

staff = []
n = int(input())
for _ in range(n):
    p = input().split()
    if p[0] == "emp":
        staff.append(Employee(p[1], int(p[2])))
    else:
        staff.append(Manager(p[1], int(p[2]), int(p[3])))
total = 0
for e in staff:
    print(f"{e.name}: {e.monthly()}")
    total += e.monthly()
print(f"Фонд: {total}")
