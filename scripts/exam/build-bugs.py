#!/usr/bin/env python3
"""
Программы с ошибками для итоговой контрольной ИБ (этап 3, задания 3.3–3.7).

Источник — исправленная программа (эталон) и описание ошибки:
    scripts/exam/solutions/bugs/<тема>/<id>.py        — эталон (студенты его не видят)
    scripts/exam/solutions/bugs/<тема>/<id>.bug.json  — {"bug": [[как в эталоне, как в программе с ошибкой], ...]}
    content/exam/bugs/<тема>/<id>.json                — название, описание, вводы тестов (первый — пример)

Скрипт строит программу с ошибкой content/exam/bugs/<тема>/<id>.py и вписывает в JSON ожидаемый
вывод каждого теста — вывод эталона. Проверяет, что:
  - каждая замена встречается в эталоне ровно один раз;
  - в программе 30–70 строк;
  - программа с ошибкой проходит не все тесты и ошибается уже на примере (тест 1).

Использование:
    python3 scripts/exam/build-bugs.py           # собрать
    python3 scripts/exam/build-bugs.py --check   # только проверить, что собранное совпадает с источником
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOLUTIONS = REPO / "scripts" / "exam" / "solutions" / "bugs"
CONTENT = REPO / "content" / "exam" / "bugs"
THEMES = ("shop", "library", "clinic")
TIMEOUT = 5


def normalize(text):
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def run(code, lines):
    try:
        proc = subprocess.run([sys.executable, "-I", "-c", code], input="\n".join(lines) + "\n",
                              capture_output=True, text=True, timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        return None, "timeout"
    return proc.stdout, (proc.stderr.strip().splitlines() or [None])[-1] if proc.returncode else None


def build(theme, fixed_path, check):
    short = fixed_path.stem
    fixed = fixed_path.read_text(encoding="utf-8")
    bugs = json.loads((fixed_path.with_suffix(".bug.json")).read_text(encoding="utf-8"))["bug"]
    meta_path = CONTENT / theme / f"{short}.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    errors = []

    buggy = fixed
    for good, bad in bugs:
        if fixed.count(good) != 1:
            errors.append(f"замена встречается {fixed.count(good)} раз: {good!r}")
        buggy = buggy.replace(good, bad, 1)
    lines = len(buggy.rstrip("\n").split("\n"))
    if not 30 <= lines <= 70:
        errors.append(f"в программе {lines} строк, нужно 30–70")

    failed = []
    for i, test in enumerate(meta["tests"], 1):
        out, err = run(fixed, test["input"])
        if err:
            errors.append(f"эталон падает на тесте {i}: {err}")
            continue
        expected = normalize(out)
        if check and normalize(test.get("output", "")) != expected:
            errors.append(f"тест {i}: ожидаемый вывод устарел, пересоберите")
        test["output"] = expected
        b_out, b_err = run(buggy, test["input"])
        if b_err or normalize(b_out or "") != expected:
            failed.append(i)
    if not failed:
        errors.append("программа с ошибкой проходит все тесты")
    elif failed[0] != 1:
        errors.append("программа с ошибкой проходит пример (тест 1) — ошибку не будет видно")

    buggy_path = CONTENT / theme / f"{short}.py"
    if check:
        if not buggy_path.exists() or buggy_path.read_text(encoding="utf-8") != buggy:
            errors.append(f"{buggy_path.name} не совпадает с эталоном и описанием ошибки, пересоберите")
    else:
        buggy_path.write_text(buggy, encoding="utf-8")
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return meta["id"], lines, failed, errors


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    bad = 0
    for theme in THEMES:
        for fixed_path in sorted((SOLUTIONS / theme).glob("*.py")):
            pid, lines, failed, errors = build(theme, fixed_path, args.check)
            status = "ОШИБКА" if errors else "ok"
            print(f"{status:6s} {pid:12s} строк {lines:2d}, программа с ошибкой не проходит тесты {failed}")
            for e in errors:
                print(f"       - {e}")
            bad += bool(errors)
    if bad:
        sys.exit(f"Проблемы в {bad} программах")


if __name__ == "__main__":
    main()
