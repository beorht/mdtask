#!/usr/bin/env python3
"""
Чекер задания №4 «Поиск и правка конфигурационных файлов».

Проверяет песочницу студента (data/ctf/configs/<id>/) по его личным значениям из
ib_config_tasks — так же, как автопроверка в терминале (server/config_task.py).

Использование:
    task4_check.py <student_id>                 JSON-отчёт одного студента (формат run_all.py)
    task4_check.py --group IB                   таблица по группе (stderr) + JSON-список (stdout)
    task4_check.py --all                        то же по всем, кому выдано задание
    ... --update-db                             записать прогресс (passed/total/solved) в БД
    ... --text                                  вместо JSON — подробный текст по каждому студенту

    --db ПУТЬ        база mdtask (по умолчанию <mdtask>/data/mdtask.db)
    --root ПУТЬ      каталог песочниц (по умолчанию <mdtask>/data/ctf/configs)

Как и bash-чекеры, для одного студента всегда завершается с кодом 0 и печатает один
JSON-объект {task, student, total_stages, passed_stages, stages[]}; при ошибке — с полем error.
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
import config_task  # noqa: E402


def check_student(conn, root_dir, student_id, update_db):
    row = config_task.load_row(conn, student_id)
    if row is None:
        return {"task": "task4", "student": student_id, "total_stages": 0, "passed_stages": 0,
                "stages": [], "error": "задание №4 этому студенту не выдано (generate_configs.py)"}
    sandbox = Path(root_dir) / student_id
    if not sandbox.is_dir():
        return {"task": "task4", "student": student_id, "total_stages": 0, "passed_stages": 0,
                "stages": [], "error": f"нет песочницы {sandbox}"}
    params = json.loads(row["params"])
    stages = config_task.check(sandbox, params, student_id)
    if update_db:
        config_task.save_progress(conn, student_id, stages)
    report = config_task.report_json(student_id, stages)
    passed, total, solved = config_task.summary(stages)
    report["required_passed"] = passed
    report["required_total"] = total
    report["solved"] = solved
    report["params"] = {k: params[k] for k in ("ssh_port", "apache_port", "upload_max")}
    return report


def main():
    ap = argparse.ArgumentParser(description="Чекер задания №4")
    ap.add_argument("student", nargs="?")
    ap.add_argument("--group")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--update-db", action="store_true")
    ap.add_argument("--text", action="store_true")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--root", default=str(REPO_ROOT / "data" / "ctf" / "configs"))
    args = ap.parse_args()
    if sum(bool(x) for x in (args.student, args.group, args.all)) != 1:
        ap.error("укажите ровно одно: student_id, --group или --all")

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    config_task.ensure_table(conn)

    if args.student:
        report = check_student(conn, args.root, args.student, args.update_db)
        if args.text and "stages" in report and report["stages"]:
            print(config_task.report_text(report["stages"]))
        else:
            print(json.dumps(report, ensure_ascii=False))
        return

    if args.group:
        ids = [r[0] for r in conn.execute(
            "SELECT t.student_id FROM ib_config_tasks t JOIN users u ON u.id = t.student_id "
            "WHERE u.student_group = ? ORDER BY t.student_id", (args.group,))]
    else:
        ids = [r[0] for r in conn.execute("SELECT student_id FROM ib_config_tasks ORDER BY student_id")]
    if not ids:
        print("Задание №4 никому из выбранных студентов не выдано.", file=sys.stderr)

    reports = []
    for sid in ids:
        report = check_student(conn, args.root, sid, args.update_db)
        reports.append(report)
        if args.text:
            print(f"=== {sid} ===")
            print(config_task.report_text(report["stages"]) if report.get("stages") else report.get("error"))
            print()
        else:
            status = "ЗАСЧИТАНО" if report.get("solved") else ("ОШИБКА" if report.get("error") else "в процессе")
            done = report.get("required_passed", 0)
            total = report.get("required_total", 0)
            print(f"{sid:16s} {done}/{total}  {status}", file=sys.stderr)
    if not args.text:
        print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
