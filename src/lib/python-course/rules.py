"""
Правила кода в задачах курса «Начальный Python» (src/lib/python-course/index.js): что запрещено и что обязательно.
Код студента только разбирается модулем ast — он не выполняется.

Вход (stdin): JSON {"code": текст, "forbid": [правила], "require": [правила]}.
Правила: "sum" — вызов встроенной функции sum(); ".sort" — вызов метода .sort(); "in" — проверка «x in …»;
"for", "while", "if", "with", "class", "def", "try" в forbid — такой конструкции быть не должно;
"import:random" — импорт модуля; в require ещё "for", "while", "def", "try", "if", "with", "class" — такая конструкция
должна быть; "def:имя" / "class:Имя" — функция / класс с таким именем; "recursion" — функция, вызывающая сама себя;
"decorator" — функция с декоратором; "import:модуль" — импорт модуля.
Выход (stdout): JSON {"syntax": текст ошибки | null, "found": [запрещённое], "missing": [обязательное, которого нет]}.
"""

import ast
import json
import sys

CONSTRUCTS = {"for": (ast.For,), "while": (ast.While,), "def": (ast.FunctionDef,), "try": (ast.Try,), "if": (ast.If,),
              "with": (ast.With,), "class": (ast.ClassDef,)}
LABELS = {"for": "цикл for", "while": "цикл while", "def": "своя функция (def)", "try": "обработка ошибок try/except",
          "if": "условие if", "in": "проверка «x in …»", "with": "конструкция with", "class": "свой класс (class)",
          "recursion": "рекурсивная функция", "decorator": "декоратор (@…)"}


def label(rule):
    if rule in LABELS:
        return LABELS[rule]
    if rule.startswith("def:"):
        return "функция " + rule[4:] + "()"
    if rule.startswith("class:"):
        return "класс " + rule[6:]
    if rule.startswith("import:"):
        return "модуль " + rule.split(":", 1)[1]
    if rule.startswith("."):
        return rule + "()"
    return rule + "()"


def check(code, forbid, require):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"syntax": f"строка {e.lineno}: {e.msg}", "found": [], "missing": []}
    found = []
    seen = set()

    def add(rule, node):
        if rule not in seen:
            seen.add(rule)
            found.append(f"{label(rule)} (строка {getattr(node, 'lineno', '?')})")

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in forbid:
                add(node.func.id, node)
            elif isinstance(node.func, ast.Attribute) and "." + node.func.attr in forbid:
                add("." + node.func.attr, node)
        elif isinstance(node, ast.Compare) and "in" in forbid:
            if any(isinstance(op, (ast.In, ast.NotIn)) for op in node.ops):
                add("in", node)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                rule = "import:" + alias.name.split(".")[0]
                if rule in forbid:
                    add(rule, node)
        elif isinstance(node, ast.ImportFrom):
            rule = "import:" + (node.module or "").split(".")[0]
            if rule in forbid:
                add(rule, node)
    nodes = list(ast.walk(tree))
    for rule in forbid:
        if rule in CONSTRUCTS:
            hit = next((n for n in nodes if isinstance(n, CONSTRUCTS[rule])), None)
            if hit is not None:
                add(rule, hit)
    imported = {a.name.split(".")[0] for n in nodes if isinstance(n, ast.Import) for a in n.names}
    imported |= {(n.module or "").split(".")[0] for n in nodes if isinstance(n, ast.ImportFrom)}
    functions = [n for n in nodes if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]

    def calls_itself(fn):
        return any(isinstance(c, ast.Call) and isinstance(c.func, ast.Name) and c.func.id == fn.name for c in ast.walk(fn))

    def present(rule):
        if rule in CONSTRUCTS:
            return any(isinstance(n, CONSTRUCTS[rule]) for n in nodes)
        if rule.startswith("def:"):
            return any(f.name == rule[4:] for f in functions)
        if rule.startswith("class:"):
            return any(isinstance(n, ast.ClassDef) and n.name == rule[6:] for n in nodes)
        if rule.startswith("import:"):
            return rule[7:] in imported
        if rule == "recursion":
            return any(calls_itself(f) for f in functions)
        if rule == "decorator":
            return any(f.decorator_list for f in functions)
        return True

    missing = [label(rule) for rule in require if not present(rule)]
    return {"syntax": None, "found": found, "missing": missing}


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    print(json.dumps(check(data.get("code", ""), data.get("forbid", []), data.get("require", [])), ensure_ascii=False))
