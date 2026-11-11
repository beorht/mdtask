"""
Тест задания №12 «Межсетевой экран: аудит и настройка iptables» (движок lab_task.py, модель
iptables в cmd_logs.py, генератор ctf/firewall): эталонное прохождение через терминал,
доказательство из вывода, ловушка. Только временные каталоги — реальные данные не трогаются.
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
sys.path.insert(0, str(IB_DIR / "ctf" / "firewall"))

import app  # noqa: E402
import cmd_logs  # noqa: E402
import firewall_task  # noqa: E402
import generate_firewall  # noqa: E402
import lab_task  # noqa: E402

STUDENT = "st-fw"


class FirewallCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = generate_firewall.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'ib-2')", (STUDENT,))
        lab_task.ensure_tables(conn)
        rng = random.Random(11)
        self.root = base / self.lab.sandbox_dir / STUDENT
        params = generate_firewall.build(self.root, STUDENT, generate_firewall.make_params(rng, STUDENT), rng)
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
        service = firewall_task.DB_ALIASES[self.p["db_port"]][0]
        return [
            "sudo iptables -L -n --line-numbers", "answer 1.1 ACCEPT", "answer 1.2 нет",
            "sudo iptables -S INPUT", "answer 2.1 {db_port}", f"answer 2.2 {service}",
            "sudo iptables -D INPUT -p tcp --dport {db_port} -j ACCEPT",
            "sudo iptables -A INPUT -p tcp --dport {db_port} -j DROP",
            "sudo iptables -P INPUT DROP",
            "grep 'Failed password' /var/log/auth.log",
            "sudo iptables -I INPUT -s {attacker_ip} -j DROP", "answer 5.1 {attacker_ip}",
            "sudo iptables -L -n --line-numbers", "answer 6.1 да", "answer 6.2 да",
        ]


class FirewallTests(FirewallCase):
    def test_reference_walkthrough(self):
        out = self.run_all(self.walkthrough())
        self.assertIn("задание №12 засчитано", out)
        self.assertEqual(self.done(), 6)

    def test_initial_ruleset_is_insecure(self):
        pol, rules = cmd_logs.parse_ruleset((self.root / "etc/iptables/rules.v4").read_text())
        self.assertEqual(pol["INPUT"], "ACCEPT")
        # порт базы данных открыт наружу
        self.assertEqual(cmd_logs.effective(pol, rules, "INPUT", "tcp", self.p["db_port"], "8.8.8.8"), "ACCEPT")
        # нужные службы тоже открыты
        for port in (22, 80, 443):
            self.assertEqual(cmd_logs.effective(pol, rules, "INPUT", "tcp", port, "8.8.8.8"), "ACCEPT")

    def test_hardening_closes_db_and_keeps_services(self):
        s = self.session
        for line in ["sudo iptables -D INPUT -p tcp --dport {db_port} -j ACCEPT",
                     "sudo iptables -A INPUT -p tcp --dport {db_port} -j DROP",
                     "sudo iptables -P INPUT DROP",
                     "sudo iptables -I INPUT -s {attacker_ip} -j DROP"]:
            app.run_line(s, line.format(**self.p, user=STUDENT))
        pol, rules = cmd_logs.parse_ruleset((self.root / "etc/iptables/rules.v4").read_text())
        self.assertEqual(pol["INPUT"], "DROP")
        self.assertIn(cmd_logs.effective(pol, rules, "INPUT", "tcp", self.p["db_port"], "8.8.8.8"), ("DROP", "REJECT"))
        self.assertIn(cmd_logs.effective(pol, rules, "INPUT", "tcp", 22, self.p["attacker_ip"]), ("DROP", "REJECT"))
        self.assertEqual(cmd_logs.effective(pol, rules, "INPUT", "tcp", 22, "1.1.1.1"), "ACCEPT")
        self.assertEqual(cmd_logs.effective(pol, rules, "INPUT", "tcp", 80, "8.8.8.8"), "ACCEPT")

    def test_answer_needs_output_and_trap(self):
        # пройти этап 1, чтобы открылся вопрос 2.1
        self.run_all(["sudo iptables -L -n --line-numbers", "answer 1.1 ACCEPT", "answer 1.2 нет"])
        # без вывода правил доказательства для 2.1 нет
        self.assertIn("не встречалось в выводе", self.run_line("answer 2.1 {db_port}"))
        self.run_line("sudo iptables -S INPUT")
        # ловушка: порт из «заметки для ИИ» отклоняется, верный порт — принимается
        self.assertIn("неверно", self.run_line("answer 2.1 {trap_port}"))
        self.assertIn("верно", self.run_line("answer 2.1 {db_port}"))

    def test_attacker_bruteforce_is_in_authlog(self):
        from collections import Counter
        import re
        text = (self.root / "var/log/auth.log").read_text()
        failed = [l for l in text.splitlines() if "Failed password" in l]
        ips = Counter(re.search(r"from (\S+)", l).group(1) for l in failed)
        self.assertEqual(ips.most_common(1)[0][0], self.p["attacker_ip"])


class TaskTextTests(unittest.TestCase):
    def test_task_markdown(self):
        lab = lab_task.get("firewall")
        params = generate_firewall.make_params(random.Random(1), STUDENT)
        md = lab.task_markdown(params, STUDENT)
        self.assertIn("# Задание №12. Межсетевой экран: аудит и настройка iptables", md)
        for k, stage in enumerate(lab.stages, 1):
            self.assertIn(f"## Этап {k}. {stage['title']}", md)


if __name__ == "__main__":
    unittest.main()
