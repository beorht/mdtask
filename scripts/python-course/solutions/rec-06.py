def subsets(s, i, cur):
    if i == len(s):
        print(cur or "-")
        return
    subsets(s, i + 1, cur)
    subsets(s, i + 1, cur + s[i])

subsets(input(), 0, "")
