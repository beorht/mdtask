import json

def flatten(items):
    out = []
    for x in items:
        if isinstance(x, list):
            out += flatten(x)
        else:
            out.append(x)
    return out

def depth(items):
    best = 1
    for x in items:
        if isinstance(x, list):
            d = 1 + depth(x)
            if d > best:
                best = d
    return best

data = json.loads(input())
print(" ".join(map(str, flatten(data))))
print(depth(data))
