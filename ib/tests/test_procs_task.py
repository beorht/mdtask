"""
Тест задания №11 «Поиск подозрительных процессов и автозапуска» (движок lab_task.py, модели
proc_model/systemd_model, генератор ctf/procs): эталонное прохождение через терминал, доказательство
из вывода, ловушка. Только временные каталоги — реальные данные не трогаются.
"""

import os
import random
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(IB_DIR / "ctf"))
sys.path.insert(0, str(IB_DIR / "ctf" / "procs"))

import app  # noqa: E402
import generate_procs  # noqa: E402
import lab_task  # noqa: E402

STUDENT = "st-procs"


class ProcsCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = generate_procs.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'IB')", (STUDENT,))
        lab_task.ensure_tables(conn)
        rng = random.Random(23)
        self.root = base / self.lab.sandbox_dir / STUDENT
        params = generate_procs.build(self.root, STUDENT, generate_procs.make_params(rng, STUDENT), rng)
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
            "ps aux --sort=-%cpu", "answer 1.1 {pid}", "answer 1.2 root",
            "readlink -f /proc/{pid}/exe", "answer 2.1 {exe}", "answer 2.2 нет",
            "ss -lntup", "ss -tnp", "answer 3.1 {port}", "answer 3.2 {c2_ip}",
            "systemctl list-units --type=service --state=running", "systemctl cat {mal}",
            "answer 4.1 {service}", "answer 4.2 {exe}",
            "systemctl list-timers --all", "cat /etc/cron.d/{mal}", "answer 5.1 {timer}", "answer 5.2 да",
            "getent passwd", "cat ~/.ssh/authorized_keys", "answer 6.1 {rogue}", "answer 6.2 {key_comment}",
            "sudo grep Accepted /var/log/auth.log", "answer 7.1 {login_time}", "answer 7.2 нет",
        ]


class ProcsTests(ProcsCase):
    def test_reference_walkthrough(self):
        out = self.run_all(self.walkthrough())
        self.assertIn("задание №11 засчитано", out)
        self.assertEqual(self.done(), 7)

    def test_scenario_is_consistent(self):
        import proc_model
        import systemd_model
        procs = proc_model.load(self.root)["procs"]
        mal = next((p for p in procs if p["pid"] == self.p["pid"]), None)
        self.assertIsNotNone(mal)
        self.assertEqual(mal["exe"], self.p["exe"])
        self.assertGreater(mal["cpu"], 50)
        units = {u["name"]: u for u in systemd_model.units_view(self.root)}
        self.assertIn(self.p["service"], units)
        self.assertIn(self.p["exe"], units[self.p["service"]]["exec"])
        self.assertIn(self.p["login_time"], (self.root / "var/log/auth.log").read_text())

    def test_commands_find_the_malware(self):
        self.assertIn(str(self.p["pid"]), self.run_line("ps aux --sort=-%cpu"))
        self.assertIn(self.p["exe"].rsplit("/", 1)[-1], self.run_line("readlink -f /proc/{pid}/exe"))
        self.assertIn(f":{self.p['port']}", self.run_line("ss -lntup"))
        self.assertIn(self.p["c2_ip"], self.run_line("ss -tnp"))
        self.assertIn(self.p["service"], self.run_line("systemctl list-units --type=service --state=running"))
        self.assertIn(self.p["exe"], self.run_line("systemctl cat {mal}"))
        self.assertIn(self.p["timer"], self.run_line("systemctl list-timers --all"))
        self.assertIn(self.p["rogue"], self.run_line("getent passwd"))

    def test_answer_needs_output_and_trap(self):
        # без вывода команды ответ с доказательством не принимается
        self.assertIn("не встречалось в выводе", self.run_line("answer 1.1 {pid}"))
        self.run_line("ps aux --sort=-%cpu")
        # ловушка: процесс, подсказанный «заметкой для ИИ» (nginx), отклоняется
        self.assertIn("неверно", self.run_line("answer 1.1 {trap_pid}"))
        self.assertIn("верно", self.run_line("answer 1.1 {pid}"))
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        pr = lab_task.load_progress(self.lab.load_row(conn, STUDENT))
        conn.close()
        self.assertTrue(pr.get("traps"))


class TaskTextTests(unittest.TestCase):
    def test_task_markdown(self):
        lab = lab_task.get("procs")
        params = generate_procs.make_params(random.Random(1), STUDENT)
        md = lab.task_markdown(params, STUDENT)
        self.assertIn("# Задание №11. Поиск подозрительных процессов и автозапуска", md)
        for k, stage in enumerate(lab.stages, 1):
            self.assertIn(f"## Этап {k}. {stage['title']}", md)


if __name__ == "__main__":
    unittest.main()
