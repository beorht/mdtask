"""
Общий движок пошаговых лабораторных заданий (№6 «Расследование инцидента», №7 «Безопасный SSH» ...).

Устроен так же, как тренажёр №5 (terminal_task.py), но не привязан к одному заданию: каждое
задание — объект Lab (ключ, номер, название, этапы, условие), а прогресс и журнал команд всех
таких заданий лежат в общих таблицах ib_lab_tasks / ib_lab_log с колонкой task.

Этап — несколько пунктов трёх видов:
  - «fs»     — состояние песочницы (файл скопирован, учётная запись заблокирована, конфиг исправлен);
  - «cmd»    — команда выполнена (по журналу ib_lab_log, только ПОСЛЕ открытия этапа);
  - «answer» — ответ командой `answer <этап>.<номер> <ответ>`.
Этапы засчитываются строго по порядку; пройденный этап остаётся пройденным.

Пункт может быть «критическим» (critical: True) — это проверка, которая должна выполняться всегда
(журнал не изменён, администратор не потерял доступ). Такие пункты показываются в check/task
с пометкой «критично», а при нарушении — предупреждение после каждой команды.
"""

import json
import re
import sqlite3
import time
import uuid

from terminal_task import Env, _norm  # noqa: F401 — Env и _norm нужны модулям заданий

TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ib_lab_tasks (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES users(id),
  params TEXT NOT NULL,
  progress TEXT NOT NULL DEFAULT '{}',
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (task, student_id)
);
CREATE TABLE IF NOT EXISTS ib_lab_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL,
  raw TEXT NOT NULL,
  line TEXT NOT NULL,
  cmds TEXT NOT NULL DEFAULT '[]',
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_lab_log_task_student ON ib_lab_log(task, student_id, id);
"""

MAX_LOG_LINE = 1000


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def ensure_tables(conn):
    conn.executescript(TABLE_SQL)


def load_progress(row):
    progress = json.loads(row["progress"] or "{}") if row else {}
    progress.setdefault("done", 0)
    progress.setdefault("opened", {"1": 0})
    progress.setdefault("completed_at", {})
    progress.setdefault("answers", {})
    progress.setdefault("attempts", {})
    return progress


# ======================================================== помощники пунктов ===

def ran_priv(env, name, pred=None, ok_only=True):
    """Команда name выполнена с правами root (через sudo)."""
    return env.ran(name, lambda c: c.get("priv") and (pred is None or pred(c)), ok_only=ok_only)


def lines_of(env, vrel):
    t = env.text(vrel)
    if t is None:
        return None
    return [line.rstrip("\r") for line in t.split("\n") if line.strip() != ""]


def ans_choice(*accepted):
    norm = {_norm(a) for a in accepted}

    def check(value, env):
        return _norm(value) in norm
    return check


def ans_time(expected):
    """Время ЧЧ:ММ:СС (можно с датой впереди: «Oct 11 02:51:07»)."""
    def check(value, env):
        m = re.search(r"(\d{1,2}):(\d{2}):(\d{2})", value)
        return bool(m) and f"{int(m.group(1)):02d}:{m.group(2)}:{m.group(3)}" == expected
    return check


# ================================================================= задание ===

class Lab:
    """Описание одного задания: этапы (как в terminal_task.STAGES) и тексты."""

    def __init__(self, key, number, title, stages, intro, sandbox_dir):
        self.key = key
        self.number = number
        self.title = title
        self.stages = stages
        self.intro = intro              # строки вступления для ~/TASK.md
        self.sandbox_dir = sandbox_dir  # имя каталога песочниц в data/ctf/
        self.total = len(stages)
        self.questions = {it["qid"]: (k, it) for k, s in enumerate(stages, 1)
                          for it in s["items"] if it["kind"] == "answer"}

    # ----------------------------------------------------------- тексты ---

    def item_text(self, item, params, student_id):
        return item["text"].format(**params, user=student_id)

    def evaluate_stage(self, k, env):
        res = []
        for item in self.stages[k - 1]["items"]:
            if item["kind"] == "answer":
                ok = bool(env.answers.get(item["qid"], {}).get("ok"))
            else:
                try:
                    ok = bool(item["check"](env))
                except Exception:  # noqa: BLE001 — неожиданное состояние песочницы = пункт не выполнен
                    ok = False
                if not ok and item.get("why"):
                    try:
                        why = item["why"](env)
                    except Exception:  # noqa: BLE001
                        why = None
                    if why:
                        item = {**item, "_why": why}
            res.append((item, ok))
        return res

    def results_with_text(self, results, params, student_id):
        out = []
        for item, ok in results:
            text = self.item_text(item, params, student_id)
            if item.get("critical"):
                text = "[критично] " + text
            if item.get("_why"):
                text += f" — {item['_why']}"
            out.append(({**item, "_text": text}, ok))
        return out

    def stage_text(self, k, params, student_id, results=None, done=0):
        stage = self.stages[k - 1]
        state = "пройден ✔" if k <= done else ("текущий" if k == done + 1 else "ещё не открыт")
        lines = [f"Этап {k} из {self.total} ({state}). {stage['title']}"]
        if stage.get("goal"):
            lines.append(f"Цель: {stage['goal'].format(**params, user=student_id)}")
        lines.append("Как выполнить:")
        lines += [f"  {x.format(**params, user=student_id)}" for x in stage["intro"]]
        lines.append("Что сделать:")
        for n, item in enumerate(stage["items"], 1):
            mark = ""
            if results is not None:
                mark = "✔ " if results[n - 1][1] else "✘ "
            elif k <= done:
                mark = "✔ "
            qid = f"[{item['qid']}] " if item["kind"] == "answer" else ""
            text = results[n - 1][0].get("_text") if results is not None else None
            if text is None:
                text = ("[критично] " if item.get("critical") else "") + self.item_text(item, params, student_id)
            lines.append(f"  {mark}{n}) {qid}{text}")
        if k == done + 1:
            lines.append("Пункты-команды засчитываются, если выполнить их после открытия этапа. Прогресс: check")
        return "\n".join(lines)

    def check_text(self, progress, results):
        done = progress["done"]
        lines = [f"Задание №{self.number} «{self.title}»: пройдено этапов {done} из {self.total}."]
        for k, stage in enumerate(self.stages, 1):
            if k <= done:
                lines.append(f"  ✔ {k}. {stage['title']}")
            elif k == done + 1:
                lines.append(f"  ▶ {k}. {stage['title']} — текущий этап:")
                for item, ok in results:
                    lines.append(f"       {'✔' if ok else '✘'} {item['_text']}")
            else:
                lines.append(f"  · {k}. {stage['title']}")
        lines.append("Все этапы пройдены! Задание засчитано." if done >= self.total
                     else "Подробнее о текущем этапе: task")
        return "\n".join(lines)

    def stages_report(self, progress, results):
        done = progress["done"]
        out = []
        for k, stage in enumerate(self.stages, 1):
            if k <= done:
                detail = "пройден " + progress["completed_at"].get(str(k), "")
            elif k == done + 1 and results is not None:
                missing = [item["_text"] for item, ok in results if not ok]
                detail = "не выполнено: " + "; ".join(missing) if missing else "все пункты выполнены"
            else:
                detail = "этап ещё не открыт"
            out.append({"stage": k, "title": stage["title"], "status": "pass" if k <= done else "fail",
                        "detail": detail, "required": True})
        return out

    def task_markdown(self, params, student_id):
        lines = [f"# Задание №{self.number}. {self.title}", ""]
        lines += [x.format(**params, user=student_id) for x in self.intro]
        lines += [
            "",
            "## Как работать с заданием",
            "",
            "- этапы проходятся **строго по порядку**: следующий открывается, когда выполнены все пункты текущего;",
            "- `task` — описание текущего этапа (`task 3` — этапа 3), `check` — прогресс по всем этапам;",
            "- `answer 3.1 42` — ответ на вопрос 3.1 (номера вопросов указаны в квадратных скобках);",
            "- пункты-команды засчитываются, только если выполнить их **после открытия этапа**;",
            "- пункты с пометкой «критично» должны выполняться всё время — нарушение не даст пройти этап;",
            "- `help` — список команд, `man КОМАНДА` — справка, Tab — дополнение имён, ↑/↓ — история.",
            "",
            "Значения в заданиях у каждого студента свои.",
            "",
        ]
        for k, stage in enumerate(self.stages, 1):
            lines.append(f"## Этап {k}. {stage['title']}")
            lines.append("")
            if stage.get("goal"):
                lines.append(f"**Цель:** {stage['goal'].format(**params, user=student_id)}")
                lines.append("")
            lines.append("Как выполнить:")
            lines.append("")
            for x in stage["intro"]:
                lines.append(f"- {x.format(**params, user=student_id)}")
            lines.append("")
            lines.append("Что сделать:")
            lines.append("")
            for n, item in enumerate(stage["items"], 1):
                qid = f"**[{item['qid']}]** " if item["kind"] == "answer" else ""
                crit = "**[критично]** " if item.get("critical") else ""
                lines.append(f"{n}. {crit}{qid}{self.item_text(item, params, student_id)}")
            lines.append("")
        return "\n".join(lines)

    # ---------------------------------------------------------- проверка ---

    def advance(self, root, student_id, params, progress, fetch_entries, last_log_id):
        newly = []
        while progress["done"] < self.total:
            k = progress["done"] + 1
            opened = progress["opened"].get(str(k), 0)
            env = Env(root, student_id, params, fetch_entries(opened), progress["answers"])
            if not all(ok for _, ok in self.evaluate_stage(k, env)):
                break
            progress["done"] = k
            progress["completed_at"][str(k)] = now_iso()
            progress["opened"][str(k + 1)] = last_log_id
            newly.append(k)
        return newly

    def current_env(self, root, student_id, params, progress, fetch_entries, k=None):
        k = k or min(progress["done"] + 1, self.total)
        opened = progress["opened"].get(str(k), 0)
        return k, Env(root, student_id, params, fetch_entries(opened), progress["answers"])

    def broken_critical(self, root, student_id, params, progress):
        """Нарушенные критические пункты открытых этапов (для предупреждения после команды)."""
        env = Env(root, student_id, params, [], progress["answers"])
        seen, out = set(), []
        for stage in self.stages[:progress["done"] + 1]:
            for item in stage["items"]:
                if not item.get("critical") or item.get("text") in seen:
                    continue
                seen.add(item.get("text"))
                try:
                    ok = bool(item["check"](env))
                except Exception:  # noqa: BLE001
                    ok = False
                if not ok:
                    out.append(self.item_text(item, params, student_id))
        return out

    def submit_answer(self, progress, params, student_id, root, args):
        if len(args) < 2:
            return ("Использование: answer <номер вопроса> <ответ>, например: answer 3.1 42\n"
                    "Номера вопросов — в описании этапа (команда task)."), False
        qid, value = args[0], " ".join(args[1:])
        if qid not in self.questions:
            return f"answer: нет вопроса с номером {qid}. Номера вопросов — в описании этапа (команда task).", False
        k, item = self.questions[qid]
        current = progress["done"] + 1
        if k > current:
            return f"answer: вопрос {qid} относится к этапу {k} — он откроется после этапа {current}.", False
        if k < current:
            return f"answer: этап {k} уже пройден.", True
        progress["attempts"][qid] = progress["attempts"].get(qid, 0) + 1
        env = Env(root, student_id, params, [], progress["answers"])
        try:
            ok = bool(item["answer"](value, env))
        except Exception:  # noqa: BLE001
            ok = False
        if ok:
            progress["answers"][qid] = {"value": value[:200], "ok": True, "at": now_iso()}
            return f"✔ Вопрос {qid}: верно!", True
        return f"✘ Вопрос {qid}: неверно, попробуйте ещё раз.", False

    # ---------------------------------------------------------------- БД ---

    def load_row(self, conn, student_id):
        conn.row_factory = sqlite3.Row
        return conn.execute("SELECT * FROM ib_lab_tasks WHERE task=? AND student_id=?",
                            (self.key, student_id)).fetchone()

    def insert_row(self, conn, student_id, params):
        conn.execute(
            "INSERT INTO ib_lab_tasks (id, task, student_id, params, progress, total, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), self.key, student_id, json.dumps(params, ensure_ascii=False),
             json.dumps(load_progress(None)), self.total, now_iso()),
        )

    def reset_row(self, conn, student_id, params):
        progress = load_progress(None)
        progress["opened"] = {"1": self.last_log_id(conn, student_id)}
        conn.execute(
            "UPDATE ib_lab_tasks SET params=?, progress=?, passed=0, total=?, solved=0, solved_at=NULL, "
            "checked_at=NULL WHERE task=? AND student_id=?",
            (json.dumps(params, ensure_ascii=False), json.dumps(progress), self.total, self.key, student_id))

    def log_line(self, conn, student_id, raw, line, cmds, status):
        cur = conn.execute(
            "INSERT INTO ib_lab_log (task, student_id, raw, line, cmds, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (self.key, student_id, raw[:MAX_LOG_LINE], line[:MAX_LOG_LINE], json.dumps(cmds, ensure_ascii=False),
             status, now_iso()),
        )
        return cur.lastrowid

    def last_log_id(self, conn, student_id):
        row = conn.execute("SELECT MAX(id) FROM ib_lab_log WHERE task=? AND student_id=?",
                           (self.key, student_id)).fetchone()
        return row[0] or 0

    def entries_fetcher(self, conn, student_id):
        def fetch(after_id):
            rows = conn.execute(
                "SELECT id, raw, line, cmds, status FROM ib_lab_log WHERE task=? AND student_id=? AND id>? ORDER BY id",
                (self.key, student_id, after_id),
            ).fetchall()
            return [{"id": r[0], "raw": r[1], "line": r[2], "cmds": json.loads(r[3]), "status": r[4]} for r in rows]
        return fetch

    def save_progress(self, conn, student_id, progress):
        """-> True, если задание только что пройдено целиком."""
        done = progress["done"]
        solved = done >= self.total
        row = conn.execute("SELECT solved FROM ib_lab_tasks WHERE task=? AND student_id=?",
                           (self.key, student_id)).fetchone()
        if row is None:
            return False
        was = bool(row[0])
        now = now_iso()
        conn.execute(
            "UPDATE ib_lab_tasks SET progress=?, passed=?, total=?, checked_at=?, solved=?, "
            "solved_at=CASE WHEN ? AND solved=0 THEN ? ELSE solved_at END WHERE task=? AND student_id=?",
            (json.dumps(progress, ensure_ascii=False), done, self.total, now, 1 if (solved or was) else 0,
             1 if solved else 0, now, self.key, student_id),
        )
        conn.commit()
        return solved and not was

    def history_lines(self, conn, student_id, limit=200):
        rows = conn.execute(
            "SELECT line FROM ib_lab_log WHERE task=? AND student_id=? ORDER BY id DESC LIMIT ?",
            (self.key, student_id, limit),
        ).fetchall()
        return [r[0] for r in reversed(rows)]

    def report_json(self, student_id, stages):
        return {"task": f"task{self.number}", "student": student_id, "total_stages": len(stages),
                "passed_stages": sum(1 for s in stages if s["status"] == "pass"), "stages": stages}


LABS = {}


def register(lab):
    LABS[lab.key] = lab
    return lab


def get(key):
    if not LABS:
        import incident_task  # noqa: F401 — регистрирует задание
        import ssh_task  # noqa: F401
    return LABS.get(key)


def keys():
    get("")
    return tuple(LABS)
