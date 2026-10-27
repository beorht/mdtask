class Page:
    total_views = 0

    def __init__(self, url):
        self.url = url
        self.views = 0

    def visit(self):
        self.views += 1
        Page.total_views += 1

n = int(input())
pages = {}
for _ in range(n):
    url = input()
    if url not in pages:
        pages[url] = Page(url)
    pages[url].visit()
for p in pages.values():
    print(f"{p.url}: {p.views}")
print(f"Всего: {Page.total_views}")
