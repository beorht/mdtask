def minutes(t):
    h, m = map(int, t.split(":"))
    return h * 60 + m

class Event:
    def __init__(self, title, day, start, end):
        self.title = title
        self.day = day
        self.start = start
        self.end = end

    def __lt__(self, o):
        return (self.day, minutes(self.start)) < (o.day, minutes(o.start))

    def overlaps(self, o):
        return self.day == o.day and minutes(self.start) < minutes(o.end) and minutes(o.start) < minutes(self.end)

class Schedule:
    def __init__(self):
        self.events = []

    def add(self, e):
        for x in self.events:
            if e.overlaps(x):
                raise ValueError(f"пересекается с {x.title}")
        self.events.append(e)

s = Schedule()
for _ in range(int(input())):
    title, day, start, end = input().split()
    try:
        s.add(Event(title, int(day), start, end))
    except ValueError as e:
        print(f"Не добавлено {title}: {e}")
for e in sorted(s.events):
    print(f"{e.day} {e.start}–{e.end} {e.title}")
