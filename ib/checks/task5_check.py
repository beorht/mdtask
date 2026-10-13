#!/usr/bin/env python3
"""
Чекер задания №5 «Основы работы в терминале Linux» (тренажёр команд).

Алгоритм тот же, что у автопроверки в терминале (server/terminal_task.py): этапы засчитываются
строго по порядку; пункты «файлы» проверяются по песочнице (data/ctf/terminal/<id>/), пункты
«команда» — по журналу ib_terminal_log (только команды после открытия этапа), пункты «вопрос» —
по ответам студента (answer). Пройденный этап остаётся пройденным. Чекер досчитывает этапы,
которые студент уже выполнил, но которые терминал ещё не засчитал (например, после правки условий).

Использование:
    task5_check.py <student_id>                 JSON-отчёт одного студента (формат run_all.py)
    task5_check.py --group IB                   таблица по группе (stderr) + JSON-список (stdout)
    task5_check.py --all                        то же по всем, кому выдано задание
    ... --update-db                             записать досчитанный прогресс в БД
    ... --text                                  подробный текст: этапы, пункты текущего этапа, ответы

    --db ПУТЬ        база mdtask (по умолчанию <mdtask>/data/mdtask.db)
    --root ПУТЬ      каталог песочниц (по умолчанию <mdtask>/data/ctf/terminal)

Для одного студента всегда завершается с кодом 0 и печатает один JSON-объект
{task, student, total_stages, passed_stages, stages[]}; при ошибке — с полем error.
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
import terminal_task as tt  # noqa: E402


def empty(student_id, error):
    return {"task": "task5", "student": student_id, "total_stages": 0, "passed_stages": 0, "stages": [],
            "error": error}


def check_student(conn, root_dir, student_id, update_db):
    row = tt.load_row(conn, student_id)
    if row is None:
        return empty(student_id, "задание №5 этому студенту не выдано (generate_terminal.py)"), None
    sandbox = Path(root_dir) / student_id
    if not sandbox.is_dir():
        return empty(student_id, f"нет песочницы {sandbox}"), None
    params = json.loads(row["params"])
    progress = tt.load_progress(row)
    fetch = tt.entries_fetcher(conn, student_id)
    tt.advance(sandbox, student_id, params, progress, fetch, tt.last_log_id(conn, student_id))
    if update_db:
        tt.save_progress(conn, student_id, progress)
    results = None
    if progress["done"] < tt.TOTAL:
        _, env = tt.current_env(sandbox, student_id, params, progress, fetch)
        results = tt.results_with_text(tt.evaluate_stage(progress["done"] + 1, env), params, student_id)
    stages = tt.stages_report(progress, results)
    report = tt.report_json(student_id, stages)
    report["required_passed"] = progress["done"]
    report["required_total"] = tt.TOTAL
    report["solved"] = progress["done"] >= tt.TOTAL
    report["wrong_answers"] = sum(n - (1 if progress["answers"].get(q, {}).get("ok") else 0)
                                  for q, n in progress["attempts"].items())
    report["commands"] = conn.execute("SELECT COUNT(*) FROM ib_terminal_log WHERE student_id=?",
                                      (student_id,)).fetchone()[0]
    return report, (progress, results)


def text_report(report, extra):
    if report.get("error"):
        return report["error"]
    progress, results = extra
    lines = [tt.check_text(progress, results or [])]
    lines.append(f"Команд в журнале: {report['commands']}, неверных ответов: {report['wrong_answers']}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Чекер задания №5")
    ap.add_argument("student", nargs="?")
    ap.add_argument("--group")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--update-db", action="store_true")
    ap.add_argument("--text", action="store_true")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--root", default=str(REPO_ROOT / "data" / "ctf" / "terminal"))
    args = ap.parse_args()
    if sum(bool(x) for x in (args.student, args.group, args.all)) != 1:
        ap.error("укажите ровно одно: student_id, --group или --all")

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    tt.ensure_tables(conn)

    if args.student:
        report, extra = check_student(conn, args.root, args.student, args.update_db)
        print(text_report(report, extra) if args.text else json.dumps(report, ensure_ascii=False))
        return

    if args.group:
        ids = [r[0] for r in conn.execute(
            "SELECT t.student_id FROM ib_terminal_tasks t JOIN users u ON u.id = t.student_id "
            "WHERE u.student_group = ? ORDER BY t.student_id", (args.group,))]
    else:
        ids = [r[0] for r in conn.execute("SELECT student_id FROM ib_terminal_tasks ORDER BY student_id")]
    if not ids:
        print("Задание №5 никому из выбранных студентов не выдано.", file=sys.stderr)

    reports = []
    for sid in ids:
        report, extra = check_student(conn, args.root, sid, args.update_db)
        reports.append(report)
        if args.text:
            print(f"=== {sid} ===")
            print(text_report(report, extra))
            print()
        else:
            status = "ЗАСЧИТАНО" if report.get("solved") else ("ОШИБКА" if report.get("error") else "в процессе")
            print(f"{sid:16s} {report.get('required_passed', 0):>2}/{report.get('required_total', 0)}  {status}",
                  file=sys.stderr)
    if not args.text:
        print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
