n = int(input())
people = [input().split() for _ in range(n)]
for name, age, city in sorted(people, key=lambda p: (p[2], -int(p[1]))):
    print(name, age, city)
