"""
Тест задания №13 «Разбор веб-атак по журналам доступа» (движок lab_task.py, генератор
ctf/webattack): эталонное прохождение через терминал, доказательство из вывода, ловушка.
Только временные каталоги — реальные данные не трогаются.
"""

import random
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(IB_DIR / "ctf"))
sys.path.insert(0, str(IB_DIR / "ctf" / "webattack"))

import app  # noqa: E402
import generate_webattack  # noqa: E402
import lab_task  # noqa: E402

STUDENT = "st-webatt"


class WebattackCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = generate_webattack.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'ib-2')", (STUDENT,))
        lab_task.ensure_tables(conn)
        rng = random.Random(7)
        self.root = base / self.lab.sandbox_dir / STUDENT
        params = generate_webattack.build(self.root, STUDENT, generate_webattack.make_params(rng, STUDENT), rng)
        self.lab.insert_row(conn, STUDENT, params)
        conn.commit()
        conn.close()
        self.p = params
        self.saved = (app.MDTASK_DB, app.CTF_LABS_DIR)
        app.MDTASK_DB, app.CTF_LABS_DIR = self.db, base
        self.session = app.SESSIONS[app.new_session(STUDENT, self.lab.key)]

    def tearDown(self):
        app.MDTASK_DB, app.CTF_LABS_DIR = self.saved
        app.SESSIONS.clear()
        self.tmp.cleanup()

    def run_line(self, line):
        return app.run_line(self.session, line.format(**self.p, user=STUDENT)) or ""

    def run_all(self, lines):
        out = ""
        for line in lines:
            out = self.run_line(line)
            out += self.defend()
        return out

    def defend(self):
        out = ""
        for _ in range(3):
            conn = sqlite3.connect(self.db)
            conn.row_factory = sqlite3.Row
            try:
                pr = lab_task.load_progress(self.lab.load_row(conn, STUDENT))
            finally:
                conn.close()
            state = (pr.get("defense") or {}).get(str(pr["done"] + 1))
            if not state or state["i"] >= len(state["qs"]):
                return out
            out += "\n" + self.run_line(f"answer q {state['qs'][state['i']]['correct'] + 1}")
        return out

    def done(self):
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        try:
            return lab_task.load_progress(self.lab.load_row(conn, STUDENT))["done"]
        finally:
            conn.close()

    def walkthrough(self):
        return [
            "cut -d' ' -f1 {log} | sort | uniq -c | sort -rn", "answer 1.1 {attacker_ip}", "answer 1.2 внешний",
            "grep {attacker_ip} {log} | grep ' 404 '", "grep {attacker_ip} {log} | grep ' 404 ' | wc -l",
            "answer 2.1 {notfound}", "answer 2.2 {tool}",
            "grep -iE 'union|select|%27' {log}", "answer 3.1 {vuln_path}", "answer 3.2 {vuln_param}",
            "grep -iE '%2e|\\.\\.' {log}", "answer 4.1 /etc/passwd", "answer 4.2 403",
            "grep -iE 'union|select' {log}", "answer 5.1 200", "answer 5.2 да",
            "grep -iE 'upload|POST' {log}", "answer 6.1 {shell_path}", "answer 6.2 POST",
            "grep {attacker_ip} {log} | head", "answer 7.1 {start_time}", "answer 7.2 нет",
        ]


class WebattackTests(WebattackCase):
    def test_reference_walkthrough(self):
        out = self.run_all(self.walkthrough())
        self.assertIn("задание №13 засчитано", out)
        self.assertEqual(self.done(), 7)

    def test_commands_find_the_attack(self):
        top = self.run_line("cut -d' ' -f1 {log} | sort | uniq -c | sort -rn")
        self.assertIn(self.p["attacker_ip"], top)
        self.assertIn(str(self.p["notfound"]),
                      self.run_line("grep {attacker_ip} {log} | grep ' 404 ' | wc -l"))
        self.assertIn(self.p["tool"], self.run_line("grep {attacker_ip} {log} | grep ' 404 '"))
        inj = self.run_line("grep -iE 'union|select' {log}")
        self.assertIn(self.p["vuln_path"].rsplit("/", 1)[-1], inj)
        self.assertIn("200", inj)
        self.assertIn("passwd", self.run_line("grep -iE 'passwd|%2e' {log}"))
        self.assertIn(self.p["shell_path"].rsplit("/", 1)[-1], self.run_line("grep -iE 'upload|POST' {log}"))

    def test_answer_needs_output_and_trap(self):
        # без вывода команды ответ с доказательством не принимается
        self.assertIn("не встречалось в выводе", self.run_line("answer 1.1 {attacker_ip}"))
        self.run_line("cut -d' ' -f1 {log} | sort | uniq -c | sort -rn")
        # ловушка: адрес из «заметки для ИИ» отклоняется
        self.assertIn("неверно", self.run_line("answer 1.1 {trap_ip}"))
        self.assertIn("верно", self.run_line("answer 1.1 {attacker_ip}"))
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        pr = lab_task.load_progress(self.lab.load_row(conn, STUDENT))
        conn.close()
        self.assertTrue(pr.get("traps"))

    def test_attacker_is_top_by_requests(self):
        from collections import Counter
        log = (self.root / "var/log/nginx/access.log").read_text()
        counts = Counter(line.split(" ", 1)[0] for line in log.splitlines() if line)
        top_ip, _ = counts.most_common(1)[0]
        self.assertEqual(top_ip, self.p["attacker_ip"])
        # все ответы 404 — только у атакующего, их ровно notfound
        self.assertEqual(sum(1 for l in log.splitlines() if " 404 " in l), self.p["notfound"])


class TaskTextTests(unittest.TestCase):
    def test_task_markdown(self):
        lab = lab_task.get("webattack")
        params = generate_webattack.make_params(random.Random(1), STUDENT)
        md = lab.task_markdown(params, STUDENT)
        self.assertIn("# Задание №13. Разбор веб-атак по журналам доступа", md)
        for k, stage in enumerate(lab.stages, 1):
            self.assertIn(f"## Этап {k}. {stage['title']}", md)


if __name__ == "__main__":
    unittest.main()
