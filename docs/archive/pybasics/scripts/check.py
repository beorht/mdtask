#!/usr/bin/env python3
"""
Проверка заданий «Простое программирование на Python» по тестам из content/pybasics/tasks.json.
Правила сравнения те же, что на сайте (src/lib/python-basics-check.js): пробелы в конце строк
и пустые строки в конце вывода не учитываются. Каждый тест — отдельный запуск, лимит 5 секунд.

    python3 scripts/python-basics/check.py --task 2 solution.py      # файл по тестам задания 2
    python3 scripts/python-basics/check.py --task word solution.py   # то же, по id задания
    python3 scripts/python-basics/check.py --student st-test-001     # последние решения студента
    python3 scripts/python-basics/check.py --student st-test-001 --task 3
    python3 scripts/python-basics/check.py --reference               # эталоны всех заданий
    python3 scripts/python-basics/check.py --list                    # список заданий

Внимание: код запускается на этом компьютере (python3 -I во временном каталоге). Чужой код
запускайте только если готовы ему доверять; на сайте код студентов выполняется в их браузере.
База (--student) открывается только на чтение. Код возврата 0 — все тесты пройдены.
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TASKS_FILE = os.path.join(ROOT, "content", "pybasics", "tasks.json")
SOLUTIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "solutions")
TIMEOUT = 5


def load_tasks():
    with open(TASKS_FILE, encoding="utf-8") as f:
        return json.load(f)["tasks"]


def find_task(tasks, key):
    for t in tasks:
        if t["id"] == key or str(t["number"]) == str(key):
            return t
    sys.exit(f"нет задания «{key}»; список: --list")


def normalize(text):
    lines = [line.rstrip(" \t") for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def run_code(code, stdin_lines):
    with tempfile.TemporaryDirectory(prefix="pybasics-") as tmp:
        path = os.path.join(tmp, "main.py")
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)
        try:
            p = subprocess.run([sys.executable, "-I", path], input="\n".join(stdin_lines) + "\n", cwd=tmp,
                               capture_output=True, text=True, timeout=TIMEOUT,
                               env={"PYTHONIOENCODING": "utf-8", "PATH": os.environ.get("PATH", "")})
        except subprocess.TimeoutExpired:
            return None, "timeout"
        err = p.stderr.strip().splitlines()[-1] if p.returncode != 0 and p.stderr.strip() else (None if p.returncode == 0 else f"код возврата {p.returncode}")
        return p.stdout, err


def check(task, code, verbose=True):
    passed = 0
    for i, test in enumerate(task["tests"], 1):
        out, err = run_code(code, test["input"])
        ok = err is None and normalize(out) == normalize(test["output"])
        passed += ok
        if verbose:
            mark = "✓" if ok else "✕"
            note = "" if ok else (" — превышено время" if err == "timeout" else f" — ошибка: {err}" if err else " — вывод не совпадает")
            print(f"  {mark} тест {i}{note}")
            if not ok and err != "timeout":
                print("      ввод:      " + " | ".join(test["input"]))
                print("      ожидалось: " + normalize(test["output"]).replace("\n", " | "))
                print("      получено:  " + normalize(out or "").replace("\n", " | "))
    total = len(task["tests"])
    print(f"Задание {task['number']} «{task['title']}»: пройдено {passed} из {total}{' — решено' if passed == total else ''}")
    return passed == total


def student_codes(db_path, student, task_ids):
    conn = sqlite3.connect(f"file:{os.path.abspath(db_path)}?mode=ro", uri=True)
    try:
        out = {}
        for tid in task_ids:
            row = conn.execute("SELECT code FROM python_basics_attempts WHERE student_id = ? AND task_id = ? ORDER BY id DESC LIMIT 1",
                               (student, tid)).fetchone()
            source = "последняя проверка"
            if not row:
                row = conn.execute("SELECT draft FROM python_basics_progress WHERE student_id = ? AND task_id = ? AND draft <> ''",
                                   (student, tid)).fetchone()
                source = "черновик"
            if row:
                out[tid] = (row[0], source)
        return out
    finally:
        conn.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", help=".py файл для проверки (с --task)")
    ap.add_argument("--task", help="номер или id задания")
    ap.add_argument("--student", help="ID студента: проверить его код из базы")
    ap.add_argument("--db", default=os.environ.get("DB_PATH") or os.path.join(ROOT, "data", "mdtask.db"))
    ap.add_argument("--reference", action="store_true", help="проверить эталонные решения всех заданий")
    ap.add_argument("--list", action="store_true", help="показать задания")
    ap.add_argument("-q", "--quiet", action="store_true", help="только итог по заданию")
    args = ap.parse_args()
    tasks = load_tasks()

    if args.list:
        for t in tasks:
            print(f"{t['number']}. {t['title']} (id {t['id']}, тестов {len(t['tests'])}, открытых {t['openTests']})")
        return 0

    if args.reference:
        ok = True
        for t in tasks:
            with open(os.path.join(SOLUTIONS, t["id"] + ".py"), encoding="utf-8") as f:
                ok = check(t, f.read(), not args.quiet) and ok
        return 0 if ok else 1

    if args.student:
        chosen = [find_task(tasks, args.task)] if args.task else tasks
        codes = student_codes(args.db, args.student, [t["id"] for t in chosen])
        ok = True
        for t in chosen:
            if t["id"] not in codes:
                print(f"Задание {t['number']} «{t['title']}»: кода нет")
                ok = False
                continue
            code, source = codes[t["id"]]
            print(f"— {source}:")
            ok = check(t, code, not args.quiet) and ok
        return 0 if ok else 1

    if not (args.task and args.file):
        ap.error("укажите --task и файл, или --student, или --reference")
    with open(args.file, encoding="utf-8") as f:
        return 0 if check(find_task(tasks, args.task), f.read(), not args.quiet) else 1


if __name__ == "__main__":
    sys.exit(main())
