#!/usr/bin/env python3
"""
Итоговая контрольная: анализ журналов действий после всех контрольных.

Читает журналы data/exam/<контрольная>/logs/<студент>.jsonl (по одному файлу на студента) и
таблицу exam_tasks (только чтение) и печатает / сохраняет:
  - summary.csv — студент × задание: время на задании, попытки, итог;
  - students.csv — по студенту: события, команды, запуски, вставки, уходы со страницы, бездействие;
  - flags.txt — подозрительное: большая вставка, решение без единого запуска, частые уходы,
    одинаковый код у разных студентов, одинаковые последовательности команд, ответы почти в одно время;
  - tasks.txt — общая картина: самые трудные задания (доля решивших, среднее время, попытки).

Использование:
    python3 scripts/exam/analyze.py [--exam ib-final-1] [--db data/mdtask.db] [--out data/exam/ib-final-1/analysis]
"""

import argparse
import csv
import hashlib
import json
import sqlite3
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BIG_PASTE = 200
AWAY_LIMIT = 10
SAME_TIME_S = 60


def ts(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def read_log(path):
    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return events


def visits(events):
    """Время на каждом месте: от просмотра страницы до следующего просмотра или ухода."""
    spent = Counter()
    current, start = None, None
    for e in events:
        if e["type"] in ("page_view", "page_leave", "session_start"):
            if current is not None:
                spent[current] += ts(e["ts"]) - start
            current, start = (e.get("task") or (f"этап {e['stage']}" if e.get("stage") else "обзор"), ts(e["ts"])) \
                if e["type"] == "page_view" else (None, None)
    if current is not None and events:
        spent[current] += ts(events[-1]["ts"]) - start
    return spent


def norm_code(code):
    lines = [line.split("#", 1)[0].rstrip() for line in (code or "").splitlines()]
    return "\n".join(line for line in lines if line.strip())


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--exam", default="ib-final-1")
    ap.add_argument("--db", default=str(REPO / "data" / "mdtask.db"))
    ap.add_argument("--dir", default=None, help="каталог контрольной (по умолчанию data/exam/<exam>)")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    exam_dir = Path(args.dir) if args.dir else REPO / "data" / "exam" / args.exam
    out = Path(args.out) if args.out else exam_dir / "analysis"
    logs = sorted((exam_dir / "logs").glob("*.jsonl"))
    if not logs:
        sys.exit(f"Журналов нет: {exam_dir / 'logs'}")
    out.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM exam_tasks WHERE exam_id=?", (args.exam,)).fetchall()
    names = {r["id"]: r["name"] for r in conn.execute("SELECT id, name FROM users")}
    tasks = defaultdict(dict)
    for r in rows:
        tasks[r["student_id"]][r["task_id"]] = r

    per_student, task_stats, flags = [], defaultdict(lambda: {"students": 0, "solved": 0, "seconds": 0.0, "attempts": 0}), []
    code_by_task = defaultdict(lambda: defaultdict(list))
    command_seqs = defaultdict(list)
    answer_times = defaultdict(list)

    summary = open(out / "summary.csv", "w", newline="", encoding="utf-8-sig")
    sw = csv.writer(summary, delimiter=";")
    sw.writerow(["Студент", "ФИО", "Задание", "Минут", "Попыток", "Запусков", "Решено", "Отправлено"])

    for path in logs:
        student = path.stem
        events = read_log(path)
        if not events:
            continue
        seqs = [e.get("seq") for e in events]
        gaps = [b for a, b in zip(seqs, seqs[1:]) if b != a + 1]
        spent = visits(events)
        mine = tasks.get(student, {})
        counts = Counter(e["type"] for e in events)
        pastes = [e for e in events if e["type"] in ("paste", "terminal_paste")]
        away = counts["blur"] + sum(1 for e in events if e["type"] == "visibility" and e.get("data", {}).get("state") == "hidden")
        idle = sum(e.get("data", {}).get("seconds", 0) for e in events if e["type"] == "idle")
        runs_by_task = Counter(e.get("task") for e in events if e["type"] == "code_run")
        per_student.append([student, names.get(student, ""), len(events), counts["terminal_cmd"], counts["code_run"],
                            counts["code_check"] + counts["sql_check"] + counts["flag_answer"], len(pastes), away,
                            round(idle / 60), round((ts(events[-1]["ts"]) - ts(events[0]["ts"])) / 60), len(gaps)])
        if gaps:
            flags.append(f"{student}: в журнале пропуски номеров seq ({len(gaps)}) — журнал повреждён или правился")
        for p in pastes:
            d = p.get("data", {})
            if d.get("chars", 0) > BIG_PASTE:
                flags.append(f"{student}: вставка {d.get('chars')} символов в {d.get('target') or 'терминал'} "
                             f"({p.get('task') or ''}) в {p['ts'][11:19]}")
        if away > AWAY_LIMIT:
            flags.append(f"{student}: уходил со страницы {away} раз")
        command_seqs[" | ".join(e["data"].get("cmd", "") for e in events if e["type"] == "terminal_cmd")[:4000]].append(student)
        for e in events:
            if e["type"] in ("flag_answer", "sql_check") and (e["data"].get("ok") or e["data"].get("isCorrect")):
                answer_times[e.get("task")].append((ts(e["ts"]), student))

        for task_id, r in sorted(mine.items()):
            minutes = round(spent.get(task_id, 0) / 60, 1)
            stat = task_stats[task_id]
            stat["students"] += 1
            stat["solved"] += r["solved"]
            stat["seconds"] += spent.get(task_id, 0)
            stat["attempts"] += r["attempts"]
            sw.writerow([student, names.get(student, ""), task_id, minutes, r["attempts"], r["runs"], r["solved"], r["submit_kind"] or ""])
            if task_id.startswith("3.") and r["answer"]:
                code_by_task[task_id][hashlib.sha256(norm_code(r["answer"]).encode()).hexdigest()].append(student)
                if r["solved"] and not runs_by_task.get(task_id):
                    flags.append(f"{student}: задание {task_id} решено без единого запуска на сайте")
    summary.close()

    for task_id, groups in sorted(code_by_task.items()):
        for students in groups.values():
            if len(students) > 1:
                flags.append(f"Одинаковый код в задании {task_id}: {', '.join(sorted(students))}")
    for seq, students in command_seqs.items():
        if seq and len(students) > 1 and seq.count("|") >= 5:
            flags.append(f"Одинаковые последовательности команд в терминале: {', '.join(sorted(students))}")
    for task_id, items in answer_times.items():
        items.sort()
        for (t1, s1), (t2, s2) in zip(items, items[1:]):
            if s1 != s2 and t2 - t1 < SAME_TIME_S:
                flags.append(f"Задание {task_id}: верные ответы {s1} и {s2} с разницей {int(t2 - t1)} с")

    with open(out / "students.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Студент", "ФИО", "Событий", "Команд", "Запусков", "Проверок/ответов", "Вставок", "Уходов", "Бездействие, мин",
                    "Длительность, мин", "Пропусков seq"])
        w.writerows(per_student)
    (out / "flags.txt").write_text("\n".join(flags) + "\n", encoding="utf-8")
    lines = ["Задание; решили; среднее время, мин; попыток в среднем"]
    for task_id, s in sorted(task_stats.items(), key=lambda kv: kv[1]["solved"] / max(kv[1]["students"], 1)):
        n = max(s["students"], 1)
        lines.append(f"{task_id}; {s['solved']}/{s['students']}; {s['seconds'] / n / 60:.1f}; {s['attempts'] / n:.1f}")
    (out / "tasks.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Журналов: {len(logs)}. Отчёты — в {out}:")
    print("  summary.csv, students.csv, tasks.txt, flags.txt")
    print(f"Подозрительного: {len(flags)}")
    for line in flags[:30]:
        print("  - " + line)


if __name__ == "__main__":
    main()
