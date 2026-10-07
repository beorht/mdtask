#!/usr/bin/env python3
"""
Прогоняет чекеры заданий (task1_check.sh, task2_check.sh, ...) по списку студентов
и собирает единый отчёт для админ-панели.

Использование:
    ./run_all.py students.json > reports/report_2026-09-27.json

Формат students.json — см. students.example.json.
Добавление нового задания: положить <task_id>_check.sh рядом со скриптами
и дописать его вызов в TASKS ниже.
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

TASKS = [
    {
        "id": "task1",
        "title": "№1. SSH: вход только по ключу",
        "script": SCRIPT_DIR / "task1_check.sh",
        "args": lambda s: [
            s["student_id"],
            s["task1"]["host"],
            s["task1"]["user"],
            s["task1"]["identity_file"],
            str(s["task1"].get("port", 22)),
        ],
        "requires": "task1",
    },
    {
        "id": "task2",
        "title": "№2. Контейнерная изоляция",
        "script": SCRIPT_DIR / "task2_check.sh",
        "args": lambda s: [s["student_id"], s["task2"]["container_name"]],
        "requires": "task2",
    },
]


def run_checker(task, student):
    if task["requires"] not in student:
        return {
            "task": task["id"],
            "student": student["student_id"],
            "total_stages": 0,
            "passed_stages": 0,
            "stages": [],
            "error": f"в students.json нет секции '{task['requires']}' для этого студента",
        }

    args = task["args"](student)
    try:
        result = subprocess.run(
            [str(task["script"]), *args],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        return {
            "task": task["id"],
            "student": student["student_id"],
            "total_stages": 0,
            "passed_stages": 0,
            "stages": [],
            "error": "таймаут выполнения проверки",
        }

    if not result.stdout.strip():
        return {
            "task": task["id"],
            "student": student["student_id"],
            "total_stages": 0,
            "passed_stages": 0,
            "stages": [],
            "error": result.stderr.strip() or "чекер не вернул вывод",
        }

    try:
        return json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return {
            "task": task["id"],
            "student": student["student_id"],
            "total_stages": 0,
            "passed_stages": 0,
            "stages": [],
            "error": f"невалидный JSON от чекера: {result.stdout[:200]}",
        }


def main():
    if len(sys.argv) != 2:
        print(f"Использование: {sys.argv[0]} students.json", file=sys.stderr)
        sys.exit(1)

    students_path = Path(sys.argv[1])
    students = json.loads(students_path.read_text())

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tasks": [{"id": t["id"], "title": t["title"]} for t in TASKS],
        "students": [],
    }

    for student in students:
        entry = {
            "student_id": student["student_id"],
            "full_name": student.get("full_name", student["student_id"]),
            "results": [],
        }
        for task in TASKS:
            result = run_checker(task, student)
            entry["results"].append(result)
            status = "OK" if result.get("error") is None and result["total_stages"] and result["passed_stages"] == result["total_stages"] else "PARTIAL/FAIL"
            print(
                f"{student['student_id']:15s} {task['id']:8s} "
                f"{result['passed_stages']}/{result['total_stages'] or '?'}  {status}",
                file=sys.stderr,
            )
        report["students"].append(entry)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
