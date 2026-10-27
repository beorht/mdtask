from itertools import permutations

word = input()
variants = sorted(set("".join(p) for p in permutations(word)))
for v in variants:
    print(v)
print(f"Всего: {len(variants)}")
