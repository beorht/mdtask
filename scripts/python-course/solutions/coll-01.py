n = int(input())
nums = list(map(int, input().split()))
freq = {}
for x in nums:
    freq[x] = freq.get(x, 0) + 1
best = None
for x, k in freq.items():
    if best is None or k > freq[best] or (k == freq[best] and x < best):
        best = x
print(best, freq[best])
