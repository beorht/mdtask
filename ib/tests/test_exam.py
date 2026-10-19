"""
Итоговая контрольная mdtask: песочница терминала (ctf/exam/generate_exam.py) и задание
«exam-<id>» в server/app.py. Только временные каталоги — реальные данные не трогаются.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IB_DIR / "server"))

import app  # noqa: E402

STUDENT = "st-exam"


class ExamSandboxTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name) / "ib-final-1" / "sandbox"
        spec = {
            "base": str(self.base),
            "student": STUDENT,
            "files": [
                {"path": "etc/app/app.conf", "content": "port = 8123\n", "mode": "640"},
                {"path": "home/{user}/.backup/.keyfile", "content": "# ключ\nIdofrq123\n", "mode": "600"},
            ],
            "databases": [{"path": "srv/app/data/app.db", "sql": "CREATE TABLE t (x INTEGER); INSERT INTO t VALUES (7);", "mode": "660"}],
            "protected": {"path": "home/{user}/backup/secret.db", "password": "Falcon123",
                          "sql": "CREATE TABLE access_codes (service TEXT, code TEXT); INSERT INTO access_codes VALUES ('CRM', 'AB-1234-CD');"},
        }
        out = subprocess.run([sys.executable, str(IB_DIR / "ctf" / "exam" / "generate_exam.py")],
                             input=json.dumps(spec), capture_output=True, text=True, check=True)
        self.assertTrue(json.loads(out.stdout)["ok"])
        self.old_dir = app.EXAM_DIR
        app.EXAM_DIR = Path(self.tmp.name)
        sid = app.new_session(STUDENT, "exam-ib-final-1")
        self.session = app.SESSIONS[sid]

    def tearDown(self):
        app.EXAM_DIR = self.old_dir
        self.tmp.cleanup()

    def run_line(self, line):
        return app.run_line(self.session, line)

    def test_task_name_and_sandbox(self):
        self.assertTrue(app.is_exam_task("exam-ib-final-1"))
        self.assertFalse(app.is_exam_task("exam-../x"))
        self.assertFalse(app.is_exam_task("exam-"))
        self.assertIn("Отказано в доступе", self.run_line("cat /etc/app/app.conf"))
        self.assertIn("port = 8123", self.run_line("sudo cat /etc/app/app.conf"))
        self.assertIn("-rw-rw----", self.run_line("ls -l /srv/app/data"))
        self.assertIn("Idofrq123", self.run_line("cat ~/.backup/.keyfile"))

    def test_protected_db_opens_with_the_password(self):
        self.assertIn("защищена паролем", self.run_line("sqlite3 backup/secret.db"))
        self.assertIn("Пароль принят", self.run_line("Falcon123"))
        self.assertIn("AB-1234-CD", self.run_line("SELECT code FROM access_codes;"))

    def test_login_refuses_a_bad_exam_task(self):
        status, body, _ = app.handle_api("/api/login", {"studentId": "nobody", "password": "x", "task": "exam-../../x"}, None)
        self.assertIn("Неизвестное задание", body["error"])


if __name__ == "__main__":
    unittest.main()
