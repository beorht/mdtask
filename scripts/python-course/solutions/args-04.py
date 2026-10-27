def card(**info):
    for key, value in info.items():
        print(f"{key}: {value}")

n = int(input())
data = {}
for _ in range(n):
    key, value = input().split("=", 1)
    data[key] = value
card(**data)
