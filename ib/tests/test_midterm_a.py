"""
Блок A ИБ-контрольной «Единое терминальное задание» (midterm-a): эталонное прохождение всех этапов
через терминал, доказательство ответа, ловушка. Только временные каталоги и БД — реальные данные не трогаются.
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
sys.path.insert(0, str(IB_DIR / "ctf" / "midterm-a"))

import app  # noqa: E402
import generate_midterm_a as GEN  # noqa: E402
import lab_task  # noqa: E402

STUDENT = "st-mida"


class MidtermACase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = GEN.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'ib-2')", (STUDENT,))
        lab_task.ensure_tables(conn)
        rng = random.Random(7)
        self.root = base / self.lab.sandbox_dir / STUDENT
        self.p = GEN.build(self.root, STUDENT, GEN.make_params(rng, STUDENT), rng)
        self.lab.insert_row(conn, STUDENT, self.p)
        conn.commit()
        conn.close()
        self.saved = (app.MDTASK_DB, app.CTF_LABS_DIR)
        app.MDTASK_DB, app.CTF_LABS_DIR = self.db, base
        self.session = app.SESSIONS[app.new_session(STUDENT, self.lab.key)]

    def tearDown(self):
        app.MDTASK_DB, app.CTF_LABS_DIR = self.saved
        app.SESSIONS.clear()
        for dirpath, dirnames, _ in os.walk(self.tmp.name):
            for d in dirnames:
                q = os.path.join(dirpath, d)
                if not os.path.islink(q):
                    os.chmod(q, 0o755)
        self.tmp.cleanup()

    def run_line(self, line):
        return app.run_line(self.session, line.format(**self.p, user=STUDENT)) or ""

    def progress(self):
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        try:
            return lab_task.load_progress(self.lab.load_row(conn, STUDENT))
        finally:
            conn.close()

    def defend(self):
        for _ in range(4):
            pr = self.progress()
            state = (pr.get("defense") or {}).get(str(pr["done"] + 1))
            if not state or state["i"] >= len(state["qs"]):
                return
            self.run_line(f"answer q {state['qs'][state['i']]['correct'] + 1}")

    def run_all(self, lines):
        for line in lines:
            self.run_line(line)
            self.defend()

    def test_walkthrough(self):
        self.run_all([
            # этап 1 — поиск и секрет
            "find /etc -type f -name '*.conf'",
            "grep -i password /etc/app/db.conf",
            "answer 1.1 {secret}",
            # этап 2 — настройка SSH
            "sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config",
            "sudo sed -i 's/^PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config",
            "sudo sed -i 's/^PermitEmptyPasswords .*/PermitEmptyPasswords no/' /etc/ssh/sshd_config",
            # этап 3 — права
            "sudo chmod 640 /etc/app/db.conf",
            "sudo chmod 600 /etc/app/app.key",
            # этап 4 — проверка
            "sudo sshd -t",
            "systemctl status ssh",
        ])
        pr = self.progress()
        self.assertEqual(pr["done"], len(GEN.LAB.stages), f"пройдено {pr['done']} из {len(GEN.LAB.stages)}; {pr}")

    def test_trap_rejects_ai_value(self):
        self.run_line("find /etc -name db.conf")
        self.run_line("grep -i password /etc/app/db.conf")
        self.run_line("answer 1.1 CHANGEME")  # значение из README.ai.txt — ловушка
        pr = self.progress()
        self.assertTrue(pr.get("traps"), "ловушка не сработала")
        self.assertEqual(pr["done"], 0, "этап не должен засчитаться по ловушке")

    def test_proof_required(self):
        # ответ верным значением, но БЕЗ чтения его командой → не засчитан (нет доказательства)
        self.run_line("answer 1.1 {secret}")
        pr = self.progress()
        self.assertTrue(pr.get("no_proof"), "ответ без доказательства должен попасть в no_proof")


if __name__ == "__main__":
    unittest.main()
