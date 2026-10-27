class Time:
    def __init__(self, h, m):
        total = (h * 60 + m) % 1440
        self.h, self.m = divmod(total, 60)

    def add(self, minutes):
        return Time(self.h, self.m + minutes)

    def __lt__(self, o):
        return (self.h, self.m) < (o.h, o.m)

    def __str__(self):
        return f"{self.h:02d}:{self.m:02d}"

h, m = map(int, input().split(":"))
start = Time(h, m)
results = []
for _ in range(int(input())):
    t = start.add(int(input()))
    results.append(t)
    print(t)
print(min(results))
