"""
Тесты задания №9 «Тренажёр grep» (server/grep_task.py, генератор ctf/grep/generate_grep.py):
эталоны дают непустой вывод на всех наборах, «почти верные» команды хотя бы на одном наборе ошибаются,
прохождение всех 13 задач через терминал на 100 баллов, отказы (не grep, перенаправление, набранный
ответ, подогнанная под свои данные команда), вопросы-мутации, подсказка.

Работают только с временными каталогами и временной БД — реальные данные не трогаются.
"""

import os
import random
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
REPO = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(IB_DIR / "ctf"))
sys.path.insert(0, str(IB_DIR / "ctf" / "grep"))

import app  # noqa: E402
import generate_grep  # noqa: E402
import grep_task  # noqa: E402
import lab_task  # noqa: E402

STUDENT = "st-grep"


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


def build(base, seed, student=STUDENT):
    rng = random.Random(seed)
    root = Path(base) / "grep" / student
    params = generate_grep.build(root, student, generate_grep.make_params(rng, student), rng)
    return root, params


def outputs(root, student, k, cmd):
    """Вывод команды на видимом наборе и на скрытых (нормализованный)."""
    home = f"home/{student}"
    res = []
    for r in [root] + grep_task.hidden_roots(root, student):
        out, _ = grep_task.run_in(r, student, home, cmd)
        res.append(grep_task.normalize(k, out, home))
    return res


class GeneratorTests(unittest.TestCase):
    def test_references_and_wrong_commands(self):
        refs = grep_task.refs()
        self.assertEqual(sorted(refs), list(range(1, 14)))
        with tempfile.TemporaryDirectory() as tmp:
            for seed in range(12):
                root, p = build(Path(tmp) / str(seed), seed)
                for k, spec in refs.items():
                    ref = outputs(root, STUDENT, k, grep_task.reference(k, p))
                    for n, lines in enumerate(ref):
                        self.assertTrue(lines and lines != [""], f"seed {seed}, задача {k}, набор {n}: пусто")
                    self.assertTrue(ref[0] != ref[1], f"seed {seed}, задача {k}: наборы совпали")
                    self.assertEqual(p["expect"][str(k)]["count"], len(ref[0]))
                    for wrong in spec["wrong"]:
                        got = outputs(root, STUDENT, k, grep_task.subst(wrong, p))
                        self.assertTrue(got != ref, f"seed {seed}, задача {k}: «{wrong}» прошла бы")

    def test_hidden_sets_outside_sandbox(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, _ = build(tmp, 3)
            for h in grep_task.hidden_roots(root, STUDENT):
                self.assertTrue((h / "var/log/auth.log").is_file())
                self.assertFalse(str(h.resolve()).startswith(str(root.resolve()) + os.sep))

    def test_stage_titles_match_site(self):
        text = (REPO / "src" / "lib" / "ib-tasks.js").read_text(encoding="utf-8")
        start = text.index("key: 'grep'")
        s = text.index("stages: [", start)
        block = text[s:text.index("],", s)]
        titles = [line.strip().strip(",").strip("'") for line in block.split("\n")[1:] if line.strip().startswith("'")]
        self.assertEqual(titles, [s["title"] for s in grep_task.STAGES])

    def test_theory_has_no_reference(self):
        theory = (IB_DIR / "ctf" / "grep" / "THEORY.md").read_text(encoding="utf-8")
        for k, spec in grep_task.refs().items():
            pattern = spec["ref"].split("'")[1] if "'" in spec["ref"] else spec["ref"]
            self.assertNotIn(pattern, theory, f"в теории эталон задачи {k}")

    def test_no_levels_in_texts(self):
        texts = [s["title"] + s["goal"] + " ".join(s["intro"]) for s in grep_task.STAGES] + grep_task.INTRO
        for t in texts:
            self.assertNotRegex(t.lower(), r"(лёгк|легк|средн|сложн)\w* (уров|задач)")


class GrepCase(unittest.TestCase):
    SEED = 11

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = grep_task.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'IB')", (STUDENT,))
        lab_task.ensure_tables(conn)
        self.root, self.p = build(base, self.SEED)
        self.lab.insert_row(conn, STUDENT, self.p)
        conn.commit()
        conn.close()
        self.saved = (app.MDTASK_DB, app.CTF_LABS_DIR, lab_task.NOW)
        self.clock = Clock(2_000_000_000.0)
        lab_task.NOW = self.clock
        app.MDTASK_DB, app.CTF_LABS_DIR = self.db, base
        self.session = app.SESSIONS[app.new_session(STUDENT, "grep")]

    def tearDown(self):
        app.MDTASK_DB, app.CTF_LABS_DIR, lab_task.NOW = self.saved
        app.SESSIONS.clear()
        self.tmp.cleanup()

    def sh(self, line):
        return app.run_line(self.session, line) or ""

    def progress(self):
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        try:
            return lab_task.load_progress(self.lab.load_row(conn, STUDENT))
        finally:
            conn.close()

    def defend(self, wrong=False):
        for _ in range(3):
            pr = self.progress()
            k = pr["done"] + 1
            state = (pr.get("defense") or {}).get(str(k))
            if not state or state["i"] >= len(state["qs"]):
                return
            q = state["qs"][state["i"]]
            choice = (q["correct"] + 1) % len(q["options"]) if wrong else q["correct"]
            self.sh(f"answer q {choice + 1}")

    def solve(self, k):
        out = self.sh(grep_task.reference(k, self.p))
        self.assertIn(f"[Задача {k}] ✔", out)
        self.clock.t += 30
        self.defend()

    def test_walkthrough_100_points(self):
        self.assertIn("Тренажёр grep", app.lab_welcome(self.session))
        for k in range(1, 14):
            self.assertEqual(self.progress()["done"], k - 1)
            self.solve(k)
        pr = self.progress()
        self.assertEqual(pr["done"], 13)
        self.assertEqual(pr["score"]["total"], 100)
        self.assertIn("засчитано", self.sh("check"))

    def test_mutation_question_answer_is_true(self):
        self.sh(grep_task.reference(1, self.p))
        pr = self.progress()
        mut = pr["grep"]["1"]["mut"]
        self.assertIsNotNone(mut)
        q = pr["defense"]["1"]["qs"][0]
        self.assertEqual(q["options"][q["correct"]], mut["answer"])
        self.assertEqual(len(set(q["options"])), 4)
        # ответ действительно равен числу строк изменённой команды
        argvs = [a.split() for a in grep_task.reference(1, self.p).split(" | ")]
        for label, variant in grep_task.mutations(argvs):
            if label == mut["label"]:
                out, _ = grep_task.run_in(self.root, STUDENT, f"home/{STUDENT}", grep_task.line_of(variant))
                self.assertEqual(str(len(out.split("\n")) if out else 0), mut["answer"])

    def test_wrong_defense_halves_points(self):
        self.sh(grep_task.reference(1, self.p))
        self.defend(wrong=True)
        pr = self.progress()
        self.assertEqual(pr["done"], 1)
        self.assertEqual(pr["score"]["stages"][0]["points"], 1.5)

    def test_refusals(self):
        out = self.sh(f"cat /var/log/auth.log | grep -iw {self.p['emp']}")
        self.assertIn("только grep", out)
        out = self.sh(f"grep -iw {self.p['emp']} /var/log/auth.log > /tmp/x")
        self.assertIn("без перенаправлений", out)
        out = self.sh(f"grep {self.p['emp']} /var/log/auth.log")
        self.assertIn("не совпадает", out)
        self.assertEqual(self.progress()["done"], 0)
        self.assertEqual(self.progress()["grep"]["1"]["tries"], 3)
        # ls — не grep: не считается попыткой
        self.sh("ls /var/log")
        self.assertEqual(self.progress()["grep"]["1"]["tries"], 3)

    def test_overfitted_command_fails_on_hidden_set(self):
        self.solve(1)
        self.solve(2)
        self.solve(3)
        # адреса из своих заметок, перечисленные в шаблоне, — верно на своих данных, неверно на проверочных
        ips, _ = grep_task.run_in(self.root, STUDENT, f"home/{STUDENT}", grep_task.reference(4, self.p))
        alt = "|".join(ip.replace(".", "\\.") for ip in ips.split("\n"))
        out = self.sh(f"grep -oE '{alt}' /srv/{self.p['svc']}/notes.txt")
        self.assertTrue("проверочном наборе" in out or "набран сам результат" in out, out)
        self.assertEqual(self.progress()["done"], 3)

    def test_typed_result_refused(self):
        line, _ = grep_task.run_in(self.root, STUDENT, f"home/{STUDENT}", grep_task.reference(1, self.p))
        first = line.split("\n")
        if len(first) == 1:
            self.skipTest("одна строка")
        out = self.sh("grep -F " + " ".join(f"-e '{x}'" for x in first) + " /var/log/auth.log")
        self.assertIn("набран сам результат", out)

    def test_hint_is_recorded(self):
        out = self.sh("hint")
        self.assertIn("теории", out)
        self.assertEqual(self.progress()["hints"], {"1": 1})

    def test_task_md_has_control_points_and_no_answers(self):
        md = (self.root / "home" / STUDENT / "TASK.md").read_text(encoding="utf-8") if \
            (self.root / "home" / STUDENT / "TASK.md").exists() else self.lab.task_markdown(self.p, STUDENT)
        self.assertIn("Задача 13", md)
        self.assertIn(str(self.p["expect"]["1"]["count"]), md)
        for k in range(1, 14):
            self.assertNotIn(grep_task.reference(k, self.p), md)


if __name__ == "__main__":
    unittest.main()
