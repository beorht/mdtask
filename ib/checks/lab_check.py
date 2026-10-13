#!/usr/bin/env python3
"""
Чекер пошаговых заданий на движке server/lab_task.py: №6 incident, №7 ssh.

Алгоритм тот же, что у автопроверки в терминале: этапы засчитываются строго по порядку, пункты
«файлы» — по песочнице (data/ctf/<задание>/<id>/), «команда» — по журналу ib_lab_log (после
открытия этапа), «вопрос» — по ответам студента. Чекер досчитывает этапы, которые студент уже
выполнил, но которые терминал ещё не засчитал.

Использование:
    lab_check.py --task incident <student_id>       JSON-отчёт одного студента (формат run_all.py)
    lab_check.py --task ssh --group IB              таблица по группе (stderr) + JSON-список (stdout)
    lab_check.py --task ssh --all                   то же по всем, кому выдано задание
    ... --update-db                                 записать досчитанный прогресс в БД
    ... --text                                      подробный текст: этапы, пункты текущего этапа

    --db ПУТЬ        база mdtask (по умолчанию <mdtask>/data/mdtask.db)
    --root ПУТЬ      каталог песочниц (по умолчанию <mdtask>/data/ctf/<каталог задания>)
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
import lab_task  # noqa: E402


def empty(lab, student_id, error):
    return {"task": f"task{lab.number}", "student": student_id, "total_stages": 0, "passed_stages": 0,
            "stages": [], "error": error}


def check_student(lab, conn, root_dir, student_id, update_db):
    row = lab.load_row(conn, student_id)
    if row is None:
        return empty(lab, student_id, f"задание №{lab.number} этому студенту не выдано"), None
    sandbox = Path(root_dir) / student_id
    if not sandbox.is_dir():
        return empty(lab, student_id, f"нет песочницы {sandbox}"), None
    params = json.loads(row["params"])
    progress = lab_task.load_progress(row)
    fetch = lab.entries_fetcher(conn, student_id)
    lab.advance(sandbox, student_id, params, progress, fetch, lab.last_log_id(conn, student_id))
    if update_db:
        lab.save_progress(conn, student_id, progress)
    results = None
    if progress["done"] < lab.total:
        k, env = lab.current_env(sandbox, student_id, params, progress, fetch)
        results = lab.results_with_text(lab.evaluate_stage(k, env), params, student_id)
    report = lab.report_json(student_id, lab.stages_report(progress, results))
    report["required_passed"] = progress["done"]
    report["required_total"] = lab.total
    report["solved"] = progress["done"] >= lab.total
    report["wrong_answers"] = sum(n - (1 if progress["answers"].get(q, {}).get("ok") else 0)
                                  for q, n in progress["attempts"].items())
    report["commands"] = conn.execute("SELECT COUNT(*) FROM ib_lab_log WHERE task=? AND student_id=?",
                                      (lab.key, student_id)).fetchone()[0]
    report["critical"] = lab.broken_critical(sandbox, student_id, params, progress)
    return report, (progress, results)


def text_report(lab, report, extra):
    if report.get("error"):
        return report["error"]
    progress, results = extra
    lines = [lab.check_text(progress, results or [])]
    for text in report["critical"]:
        lines.append(f"[критично] нарушено: {text}")
    lines.append(f"Команд в журнале: {report['commands']}, неверных ответов: {report['wrong_answers']}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Чекер заданий №6–7 (ib/server/lab_task.py)")
    ap.add_argument("--task", required=True, choices=lab_task.keys())
    ap.add_argument("student", nargs="?")
    ap.add_argument("--group")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--update-db", action="store_true")
    ap.add_argument("--text", action="store_true")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--root")
    args = ap.parse_args()
    if sum(bool(x) for x in (args.student, args.group, args.all)) != 1:
        ap.error("укажите ровно одно: student_id, --group или --all")
    lab = lab_task.get(args.task)
    root = args.root or str(REPO_ROOT / "data" / "ctf" / lab.sandbox_dir)

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    lab_task.ensure_tables(conn)

    if args.student:
        report, extra = check_student(lab, conn, root, args.student, args.update_db)
        print(text_report(lab, report, extra) if args.text else json.dumps(report, ensure_ascii=False))
        return

    if args.group:
        ids = [r[0] for r in conn.execute(
            "SELECT t.student_id FROM ib_lab_tasks t JOIN users u ON u.id = t.student_id "
            "WHERE t.task = ? AND u.student_group = ? ORDER BY t.student_id", (lab.key, args.group))]
    else:
        ids = [r[0] for r in conn.execute("SELECT student_id FROM ib_lab_tasks WHERE task = ? ORDER BY student_id",
                                          (lab.key,))]
    if not ids:
        print(f"Задание №{lab.number} никому из выбранных студентов не выдано.", file=sys.stderr)

    reports = []
    for sid in ids:
        report, extra = check_student(lab, conn, root, sid, args.update_db)
        reports.append(report)
        if args.text:
            print(f"=== {sid} ===")
            print(text_report(lab, report, extra))
            print()
        else:
            status = "ЗАСЧИТАНО" if report.get("solved") else ("ОШИБКА" if report.get("error") else "в процессе")
            print(f"{sid:16s} {report.get('required_passed', 0):>2}/{report.get('required_total', 0)}  {status}",
                  file=sys.stderr)
    if not args.text:
        print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
