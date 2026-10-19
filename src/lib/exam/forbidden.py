"""
Запрещённое в заданиях-алгоритмах итоговой контрольной (src/lib/exam/algorithms.js):
готовые функции, которые делают работу алгоритма за студента.

Код студента только разбирается модулем ast — он не выполняется.
Вход (stdin): текст программы. Выход (stdout): JSON {"syntax": текст ошибки | null, "found": [описания]}.
"""

import ast
import json
import sys

CALLS = {"sorted": "sorted()", "min": "min()", "max": "max()"}
METHODS = {"sort": ".sort()", "index": ".index()", "find": ".find()", "rfind": ".rfind()", "rindex": ".rindex()",
           "count": ".count()"}
MODULES = {"heapq", "bisect"}


def check(code):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"syntax": f"строка {e.lineno}: {e.msg}", "found": []}
    found = []

    def add(text, node):
        item = (getattr(node, "lineno", 0), f"{text} (строка {getattr(node, 'lineno', '?')})")
        if item not in found:
            found.append(item)

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in CALLS:
                add(CALLS[node.func.id], node)
            elif isinstance(node.func, ast.Attribute) and node.func.attr in METHODS:
                add(METHODS[node.func.attr], node)
        elif isinstance(node, ast.Compare):
            if any(isinstance(op, (ast.In, ast.NotIn)) for op in node.ops):
                add("проверка «x in …»", node)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] in MODULES:
                    add(f"модуль {alias.name}", node)
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] in MODULES:
                add(f"модуль {node.module}", node)
    return {"syntax": None, "found": [text for _, text in sorted(found)]}


if __name__ == "__main__":
    print(json.dumps(check(sys.stdin.read()), ensure_ascii=False))
