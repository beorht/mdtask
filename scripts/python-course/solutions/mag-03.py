class Player:
    def __init__(self, name, score):
        self.name = name
        self.score = score

    def __lt__(self, other):
        if self.score != other.score:
            return self.score < other.score
        return self.name > other.name

    def __str__(self):
        return f"{self.name} ({self.score})"

players = []
for _ in range(int(input())):
    name, score = input().split()
    players.append(Player(name, int(score)))
for p in sorted(players, reverse=True):
    print(p)
