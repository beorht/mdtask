import json

def leaves(node):
    if not isinstance(node, dict):
        return 1
    total = 0
    for value in node.values():
        total += leaves(value)
    return total

tree = json.loads(input())
node = tree
for part in input().split("/"):
    if not isinstance(node, dict) or part not in node:
        node = None
        break
    node = node[part]
if node is None:
    print("не найдено")
elif isinstance(node, dict):
    print("это папка")
else:
    print(node)
print(f"Листьев: {leaves(tree)}")
