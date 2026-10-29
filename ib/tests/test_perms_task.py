"""
Тест задания №10 «Права доступа и аудит сервера» (движок server/lab_task.py, модель владельцев
server/vfs.py, команды chown/chgrp, stat, find -perm/-nouser, генератор ctf/perms):
эталонное прохождение через терминал, модель прав, ловушка и критические пункты.

Работает только с временными каталогами и временной БД — реальные данные не трогаются.
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
sys.path.insert(0, str(IB_DIR / "ctf" / "perms"))

import app  # noqa: E402
import generate_perms  # noqa: E402
import lab_task  # noqa: E402

STUDENT = "st-perms"


class PermsCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = generate_perms.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'IB')", (STUDENT,))
        lab_task.ensure_tables(conn)
        rng = random.Random(11)
        self.root = base / self.lab.sandbox_dir / STUDENT
        params = generate_perms.build(self.root, STUDENT, generate_perms.make_params(rng, STUDENT), rng)
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
        for dirpath, dirnames, _ in os.walk(self.tmp.name):
            for d in dirnames:
                p = os.path.join(dirpath, d)
                if not os.path.islink(p):
                    os.chmod(p, 0o755)
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
        p = self.p
        lines = [
            # 1. учётные записи
            "getent passwd", "answer 1.1 {rogue}", "answer 1.2 0",
            # 2. чтение прав
            "stat -c '%a %U %G %n' {conf_display}", "answer 2.1 {conf_mode}", "answer 2.2 {conf_owner}",
            # 3. запись для всех
            "find / -type f -perm -o+w 2>/dev/null | wc -l", "answer 3.1 {ww_count}",
        ]
        lines += [f"sudo chmod o-w /{rel}" for rel in p["ww_files"]]
        lines += [
            # 4. секреты
            "sudo chmod 640 /etc/shadow",
            "sudo chown www-data:www-data {env_display}", "sudo chmod 640 {env_display}",
            "sudo chmod 600 {key_display}", "sudo chmod 640 {backup_display}",
            # 5. SUID
            "find / -perm -4000 -type f 2>/dev/null", "answer 5.1 {suid_extra}", "sudo chmod u-s {suid_extra}",
            # 6. владельцы приложения
            "find {srv_display} -nouser 2>/dev/null",
            "sudo chown -R www-data:www-data {srv_display}/legacy", "sudo chmod 775 {uploads_display}",
            # 7. пользователи и sudo
            "sudo gpasswd -d {intern} sudo", "sudo passwd -l {former}", "sudo passwd -l {rogue}",
            # 8. повторный аудит
            "find / -type f -perm -o+w 2>/dev/null | wc -l", "answer 8.1 0",
            "find / -perm -4000 -type f 2>/dev/null",
        ]
        return lines


class PermsTests(PermsCase):
    def test_reference_walkthrough(self):
        out = self.run_all(self.walkthrough())
        self.assertIn("задание №10 засчитано", out)
        self.assertEqual(self.done(), 8)

    def test_scenario_is_consistent(self):
        p = self.p
        users = {ln.split(":")[0]: ln.split(":") for ln in (self.root / "etc/passwd").read_text().splitlines()}
        self.assertEqual(users[p["rogue"]][2], "0", "лишняя учётная запись имеет UID 0")
        self.assertEqual(len(p["ww_files"]), p["ww_count"])
        self.assertTrue((self.root / p["suid_extra"].lstrip("/")).stat().st_mode & 0o4000)
        self.assertTrue((self.root / "usr/bin/passwd").stat().st_mode & 0o4000)
        self.assertEqual((self.root / "tmp").stat().st_mode & 0o7777, 0o1777)
        self.assertTrue((self.root / "var/lib/seclab/owners.json").exists())

    def test_owner_model_and_commands(self):
        p = self.p
        # chown меняет владельца только с sudo
        self.assertIn("Операция не позволена", self.run_line("chown www-data {env_display}"))
        self.run_line("sudo chown www-data:www-data {env_display}")
        self.assertIn("www-data", self.run_line("stat -c '%U' {env_display}"))
        # stat показывает UID 0 у лишней записи
        self.assertIn("0", self.run_line("id {rogue}"))
        # find находит файлы без владельца и world-writable
        self.assertIn("legacy", self.run_line("find {srv_display} -nouser 2>/dev/null"))
        self.assertIn(str(p["ww_count"]), self.run_line("find / -type f -perm -o+w 2>/dev/null | wc -l"))

    def test_answer_needs_output_and_trap(self):
        # без вывода команды ответ с доказательством не принимается
        self.assertIn("не встречалось в выводе", self.run_line("answer 1.1 {rogue}"))
        self.run_line("getent passwd")
        # ловушка: учётную запись подсказала «инструкция для ИИ» (бывший сотрудник, а не запись с UID 0)
        self.assertIn("неверно", self.run_line("answer 1.1 {former}"))
        self.assertIn("верно", self.run_line("answer 1.1 {rogue}"))
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        pr = lab_task.load_progress(self.lab.load_row(conn, STUDENT))
        conn.close()
        self.assertTrue(pr.get("traps"), "ответ-ловушка записан")

    def test_critical_tmp_and_suid(self):
        self.run_all(self.walkthrough()[:7])   # дошли до этапа 3 (вопрос + find)
        self.assertEqual(self.done(), 2)
        # сломать sticky-бит /tmp — критический пункт не даст пройти этап 3
        self.run_line("answer 3.1 {ww_count}")
        for rel in self.p["ww_files"]:
            self.run_line(f"sudo chmod o-w /{rel}")
        self.run_line("sudo chmod 777 /tmp")
        self.defend()
        self.assertEqual(self.done(), 2, "этап 3 с нарушенным /tmp не засчитан")
        self.run_line("sudo chmod 1777 /tmp")
        self.defend()
        self.assertEqual(self.done(), 3)


class TaskTextTests(unittest.TestCase):
    def test_task_markdown(self):
        lab = lab_task.get("perms")
        rng = random.Random(3)
        params = generate_perms.make_params(rng, STUDENT)
        md = lab.task_markdown(params, STUDENT)
        self.assertIn("# Задание №10. Права доступа и аудит сервера", md)
        for k, stage in enumerate(lab.stages, 1):
            self.assertIn(f"## Этап {k}. {stage['title']}", md)


if __name__ == "__main__":
    unittest.main()
