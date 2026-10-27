n = int(input())
points = set()
for _ in range(n):
    x, y = map(int, input().split())
    points.add((x, y))
print(len(points))
best = None
for p in sorted(points):
    if best is None or p[0] ** 2 + p[1] ** 2 > best[0] ** 2 + best[1] ** 2:
        best = p
print(best[0], best[1])
