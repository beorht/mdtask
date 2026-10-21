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

Необязательные возможности (задание №8 «logs»):
  - «следы» вывода (Lab.track_output): после каждой команды из её вывода сохраняются IP-адреса, время,
    даты, слова и числа (таблица ib_lab_seen); пункт-ответ с "proof" принимается, только если ответ
    (или нужные для него значения) встречался в выводе команд студента;
  - "trap" у пункта-ответа: ловушечный ответ (тот, что подсказывают строки-инструкции в журнале или
    текст, добавленный к скопированному) отклоняется и записывается в progress["traps"];
  - пауза 2 минуты после 3 неверных ответов подряд на один вопрос;
  - контрольные вопросы (Lab.defense): когда все пункты этапа выполнены, задаются 2 вопроса по работе
    студента, 60 секунд на каждый (answer q НОМЕР); этап засчитывается после ответа на оба;
  - Lab.score(progress, params) — баллы, сохраняются в progress["score"];
  - Lab.before_run — действие перед каждой командой (живой журнал «Дежурства SOC»),
    Lab.commands — свои команды задания (duty, timeline), Lab.load_ext — данные с сайта (детектор).

Пункт может быть «критическим» (critical: True) — это проверка, которая должна выполняться всегда
(журнал не изменён, администратор не потерял доступ). Такие пункты показываются в check/task
с пометкой «критично», а при нарушении — предупреждение после каждой команды.
"""

import json
import re
import sqlite3
import time
import uuid

import defense as defense_mod
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
CREATE TABLE IF NOT EXISTS ib_lab_seen (
  task TEXT NOT NULL,
  student_id TEXT NOT NULL,
  token TEXT NOT NULL,
  log_id INTEGER NOT NULL,
  PRIMARY KEY (task, student_id, token)
);
"""

MAX_LOG_LINE = 1000
DEFENSE_SECONDS = defense_mod.DEFENSE_SECONDS
PAUSE_AFTER = 3          # неверных ответов подряд на один вопрос
PAUSE_SECONDS = 120
MAX_EVENTS = 400         # попыток ответов в progress["events"]
SHORT_OUTPUT = 60        # числа берутся в «следы» только из короткого вывода (wc -l, uniq -c ...)
MAX_TOKENS = 4000

NOW = time.time          # подменяется в тестах
defense_mod.NOW = lambda: NOW()   # контрольные вопросы (defense.py) идут по тем же часам
NO_PROOF_COMMANDS = {"answer", "task", "check", "echo", "printf", "history", "timeline", "duty", "help", "man"}

TOKEN_RES = [
    re.compile(r"(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?:/\d{1,2})?(?![\d.])"),   # IP и подсети
    re.compile(r"\b\d{4}-\d{2}-\d{2}\b"),                                     # даты
    re.compile(r"\b\d{2}:\d{2}:\d{2}\b"),                                     # время
    re.compile(r"\b\d{2}/[A-Za-z]{3}/\d{4}\b"),                                 # дата nginx
    re.compile(r"[A-Za-z][A-Za-z0-9_.\-]{1,40}"),                               # имена (от 2 букв), пути, действия
]
NUMBER_RE = re.compile(r"(?<![\d.:])\d+(?![\d.:])")


def output_tokens(output):
    """«Следы» вывода команды: что студент видел на экране."""
    if not output:
        return set()
    tokens = set()
    for rx in TOKEN_RES:
        for m in rx.finditer(output):
            tokens.add(m.group(0).lower())
            if len(tokens) >= MAX_TOKENS:
                return tokens
    if output.count("\n") < SHORT_OUTPUT:
        tokens.update(NUMBER_RE.findall(output))
    for m in re.finditer(r"\bseq=(\d+)", output):
        tokens.add(m.group(1))
    return tokens


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def record_tokens(conn, task, student_id, log_id, output, line=""):
    """Значения, которые студент увидел в выводе (ib_lab_seen). То, что он сам набрал в строке команды, и вывод
    команд, повторяющих ввод (echo, printf, answer …), не считается — иначе «доказательство» подделывается."""
    first = (line.strip().split() or [""])[0]
    if first in NO_PROOF_COMMANDS or re.search(r"(^|[|;&]\s*)(echo|printf)\b", line):
        return
    typed = output_tokens(line) | set(NUMBER_RE.findall(line))
    tokens = output_tokens(output) - typed
    if tokens:
        conn.executemany("INSERT OR IGNORE INTO ib_lab_seen (task, student_id, token, log_id) VALUES (?, ?, ?, ?)",
                         [(task, student_id, tok, log_id) for tok in tokens])


def seen_lookup_for(conn, task, student_id, log_table="ib_lab_log"):
    """token -> строка команды, в выводе которой он впервые появился (или None)."""
    def lookup(token):
        row = conn.execute(
            f"SELECT l.line FROM ib_lab_seen s JOIN {log_table} l ON l.id = s.log_id "
            "WHERE s.task=? AND s.student_id=? AND s.token=?", (task, student_id, str(token).lower())).fetchone()
        return row[0] if row else None
    return lookup


def check_proof(item, value, env):
    """-> список значений ответа, которых не было в выводе команд (пусто — доказано)."""
    try:
        need = item["proof"](value, env) if callable(item["proof"]) else [_norm(value)]
    except Exception:  # noqa: BLE001
        need = [_norm(value)]
    return [x for x in need if env.seen(_norm(x)) is None]


NO_PROOF_TEXT = ("✘ Вопрос {qid}: значение «{value}» не встречалось в выводе ваших команд. "
                 "Получите его в своём терминале на своих данных и ответьте снова "
                 "(вывод команд учитывается с 21.10.2026 — если вы видели значение раньше, выполните команду ещё раз).")


def bank_defense(stages, bank, decoys=None):
    """Контрольные вопросы из банка: «какой командой вы получили …» (если есть доказанный ответ) + по смыслу этапа."""
    def make(k, env, params, progress):
        rng = defense_mod.rng_for(params, k, "cmd")
        first = None
        candidates = []
        for item in stages[k - 1]["items"]:
            if item["kind"] == "answer" and item.get("proof") and item["qid"] in env.answers:
                value = env.answers[item["qid"]].get("value", "")
                try:
                    tokens = item["proof"](value, env) if callable(item["proof"]) else [_norm(value)]
                except Exception:  # noqa: BLE001
                    tokens = [_norm(value)]
                for token in tokens:
                    line = env.seen(_norm(token))
                    if line and len(line) <= 200:
                        candidates.append((item["qid"], value, line))
                        break
        if candidates and decoys and decoys.get(k):
            qid, value, line = rng.choice(candidates)
            first = defense_mod.command_question(rng, value, qid, line, list(decoys[k]))
        return defense_mod.from_bank(bank, k, params, 2, first)
    return make


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
        self.track_output = False
        self.defense = None      # (k, env, params, progress) -> [{"text", "options", "correct"}]
        self.score = None        # (progress, params) -> {"total": N, "stages": [...]}
        self.before_run = None   # (state) -> True, если progress изменился
        self.commands = {}       # имя -> (state, args) -> (текст, ok)
        self.load_ext = None     # (conn, student_id) -> dict, попадает в params["_ext"]
        self.on_command = None   # (state, line, ctx, output) -> [сообщения]: своя проверка каждой команды (№9)
        self.help_line = ("Команды задания: task — инструкция к текущему этапу, check — прогресс, "
                          "answer N.M ОТВЕТ — ответ на вопрос, cat TASK.md — все этапы.")

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

    def advance(self, root, student_id, params, progress, fetch_entries, last_log_id, seen=None):
        newly = []
        while progress["done"] < self.total:
            k = progress["done"] + 1
            opened = progress["opened"].get(str(k), 0)
            env = Env(root, student_id, params, fetch_entries(opened), progress["answers"])
            env.seen = seen or (lambda token: None)
            if not all(ok for _, ok in self.evaluate_stage(k, env)):
                break
            if self.defense is not None and not defense_mod.gate(
                    progress, k, lambda: self.defense(k, env, params, progress)):
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

    # ------------------------------------------------ контрольные вопросы ---

    def defense_pending(self, progress):
        return defense_mod.pending(progress)

    def defense_text(self, progress):
        return defense_mod.text(progress)

    def answer_defense(self, progress, args):
        return defense_mod.answer(progress, args)

    def _event(self, progress, **fields):
        events = progress.setdefault("events", [])
        events.append({**fields, "at": now_iso()})
        del events[:-MAX_EVENTS]

    def submit_answer(self, progress, params, student_id, root, args, seen=None):
        if defense_mod.is_defense_answer(args):
            return self.answer_defense(progress, args)
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
        if self.defense_pending(progress)[1] is not None:
            return "Сначала ответьте на контрольный вопрос:\n" + self.defense_text(progress), False
        pause = progress.setdefault("pause", {}).get(qid, 0)
        if NOW() < pause:
            return (f"answer: после {PAUSE_AFTER} неверных ответов подряд — пауза. "
                    f"Попробуйте через {int(pause - NOW()) + 1} с и перепроверьте данные."), False
        progress["attempts"][qid] = progress["attempts"].get(qid, 0) + 1
        env = Env(root, student_id, params, [], progress["answers"])
        env.seen = seen or (lambda token: None)
        streak = progress.setdefault("streak", {})
        try:
            trap = item["trap"](value, env) if item.get("trap") else None
        except Exception:  # noqa: BLE001
            trap = None
        if trap:
            progress.setdefault("traps", []).append({"qid": qid, "value": value[:200], "trap": trap,
                                                    "at": now_iso()})
            self._event(progress, qid=qid, value=value[:200], ok=False, trap=trap)
            return self._wrong(progress, qid, streak)
        try:
            ok = bool(item["answer"](value, env))
        except Exception:  # noqa: BLE001
            ok = False
        proof = None
        if ok and item.get("proof"):
            missing = check_proof(item, value, env)
            proof = not missing
            if missing:
                self._event(progress, qid=qid, value=value[:200], ok=False, proof=False)
                progress.setdefault("no_proof", []).append({"qid": qid, "value": value[:200], "at": now_iso()})
                return NO_PROOF_TEXT.format(qid=qid, value=value[:60]), False
        if ok:
            streak[qid] = 0
            progress["answers"][qid] = {"value": value[:200], "ok": True, "at": now_iso(), "proof": proof}
            self._event(progress, qid=qid, value=value[:200], ok=True, proof=proof)
            return f"✔ Вопрос {qid}: верно!", True
        self._event(progress, qid=qid, value=value[:200], ok=False)
        return self._wrong(progress, qid, streak)

    def _wrong(self, progress, qid, streak):
        streak[qid] = streak.get(qid, 0) + 1
        if streak[qid] >= PAUSE_AFTER:
            streak[qid] = 0
            progress.setdefault("pause", {})[qid] = NOW() + PAUSE_SECONDS
            return (f"✘ Вопрос {qid}: неверно. {PAUSE_AFTER} неверных ответа подряд — следующий ответ "
                    f"через {PAUSE_SECONDS // 60} минуты."), False
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
        # Новые данные — старые «следы» вывода больше ничего не доказывают.
        conn.execute("DELETE FROM ib_lab_seen WHERE task=? AND student_id=?", (self.key, student_id))
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
        progress.pop("_ask", None)
        if self.score is not None:
            try:
                row = conn.execute("SELECT params FROM ib_lab_tasks WHERE task=? AND student_id=?",
                                   (self.key, student_id)).fetchone()
                progress["score"] = self.score(progress, json.loads(row[0]) if row else {})
            except Exception:  # noqa: BLE001 — баллы не должны ломать сохранение
                pass
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

    def record_output(self, conn, student_id, log_id, output, line=""):
        record_tokens(conn, self.key, student_id, log_id, output, line)

    def seen_lookup(self, conn, student_id):
        return seen_lookup_for(conn, self.key, student_id)

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
        import logs_task  # noqa: F401
        import grep_task  # noqa: F401
    return LABS.get(key)


def keys():
    get("")
    return tuple(LABS)
