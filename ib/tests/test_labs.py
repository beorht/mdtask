"""
Тесты заданий №6 «Расследование инцидента» и №7 «Безопасный SSH» (движок server/lab_task.py,
команды server/cmd_admin.py, модель SSH server/sshd_sim.py, генераторы ctf/incident и ctf/ssh):
эталонное прохождение через терминал, ловушки и критические пункты.

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
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(IB_DIR / "ctf"))
sys.path.insert(0, str(IB_DIR / "ctf" / "incident"))
sys.path.insert(0, str(IB_DIR / "ctf" / "ssh"))

import app  # noqa: E402
import generate_incident  # noqa: E402
import generate_ssh  # noqa: E402
import lab_task  # noqa: E402
import sshd_sim  # noqa: E402

STUDENT = "st-lab"


class LabCase(unittest.TestCase):
    GEN = None

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        lab = self.GEN.LAB
        self.lab = lab
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'IB')", (STUDENT,))
        lab_task.ensure_tables(conn)
        rng = random.Random(7)
        self.root = base / lab.sandbox_dir / STUDENT
        params = self.GEN.build(self.root, STUDENT, self.GEN.make_params(rng, STUDENT), rng)
        lab.insert_row(conn, STUDENT, params)
        conn.commit()
        conn.close()
        self.p = params
        self.saved = (app.MDTASK_DB, app.CTF_LABS_DIR)
        app.MDTASK_DB, app.CTF_LABS_DIR = self.db, base
        self.session = app.SESSIONS[app.new_session(STUDENT, lab.key)]

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
        """Верно ответить на контрольные вопросы этапа, если они заданы. -> их вывод."""
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


INCIDENT = [
    "ls -l /var/log", "sudo tail -n 2 /var/log/auth.log", "sudo wc -l /var/log/auth.log",
    "answer 1.1 {auth_lines}", "answer 1.2 {last_time}",
    "mkdir ~/evidence", "sudo cp /var/log/auth.log ~/evidence/auth.log",
    "sudo sha256sum /var/log/auth.log > ~/evidence/auth.log.sha256",
    "sudo grep -c 'Failed password' /var/log/auth.log", "sudo grep Accepted /var/log/auth.log",
    "sudo grep 'Failed password for {target}' /var/log/auth.log | grep -o 'from [0-9.]*' | uniq -c",
    "answer 3.1 {failed_total}", "answer 3.2 {attacker_ip}", "answer 3.3 {target}", "answer 3.4 {attack_failed}",
    "answer 4.1 {login_time}", "answer 4.2 {file}", "answer 4.3 {bad_mode}", "answer 4.4 sudo",
    "mkdir -p ~/incident", "sudo grep '{attacker_ip}' /var/log/auth.log > ~/incident/timeline.txt",
    "sudo grep 'sudo: *{target} :' /var/log/auth.log > ~/incident/sudo.txt",
    "sudo grep -c 'Failed password for admin ' /var/log/auth.log",
    "answer 6.1 да", "answer 6.2 нет", "answer 6.3 {admin_failed}",
    "sudo usermod -L {target}", "sudo gpasswd -d {target} sudo", "sudo chmod 640 {file}",
    "cp ~/incident/report-template.txt ~/incident/report.txt",
    "sed -i 's/^Учётная запись:.*/Учётная запись: {target}/' ~/incident/report.txt",
    "sed -i 's/^IP-адрес:.*/IP-адрес: {attacker_ip}/' ~/incident/report.txt",
    "sed -i 's/^Неудачных попыток:.*/Неудачных попыток: {attack_failed}/' ~/incident/report.txt",
    "sed -i 's/^Время входа:.*/Время входа: {login_time}/' ~/incident/report.txt",
    "sed -i 's#^Изменённый файл:.*#Изменённый файл: {file}#' ~/incident/report.txt",
    "sed -i 's/^Меры:.*/Меры: заблокирована, удалена из sudo, права 640/' ~/incident/report.txt",
]


class IncidentTests(LabCase):
    GEN = generate_incident

    def test_reference_walkthrough(self):
        out = self.run_all(INCIDENT)
        self.assertIn("задание №6 засчитано", out)
        self.assertEqual(self.done(), 8)

    def test_scenario_is_consistent(self):
        p = self.p
        self.assertGreater(p["failed_total"], p["attack_failed"] + 5, "сканер шумит сильнее атакующего")
        self.assertTrue(any("Accepted password for " + p["target"] in x for x in p["timeline"]))
        self.assertTrue(any(f"chmod {p['bad_mode']} {p['file']}" in x for x in p["sudo_lines"]))
        self.assertEqual(oct(os.stat(self.root / p["file"].lstrip("/")).st_mode & 0o777)[2:], p["bad_mode"])

    def test_log_needs_sudo_and_tampering_is_critical(self):
        self.assertIn("Отказано в доступе", self.run_line("cat /var/log/auth.log"))
        self.run_all(INCIDENT[:8])
        self.assertEqual(self.done(), 2)
        out = self.run_line("sudo sed -i '1d' /var/log/auth.log")
        self.assertIn("[Внимание, критично] Нарушено: Исходный журнал", out)
        self.run_all(INCIDENT[8:19])
        self.assertEqual(self.done(), 4)
        self.run_all(INCIDENT[19:22])
        self.assertEqual(self.done(), 4, "этап 5 с критическим пунктом не засчитан, пока журнал изменён")

    def test_wrong_answers_and_locking_admin(self):
        self.run_all(INCIDENT[:8])
        self.assertIn("неверно", self.run_line("answer 3.2 {scanner_ip}"))
        self.run_all(INCIDENT[8:26])
        self.assertEqual(self.done(), 6)
        self.assertIn("[Внимание, критично]", self.run_line("sudo passwd -l admin"))
        self.run_all(INCIDENT[26:29])
        self.assertEqual(self.done(), 6)
        self.run_line("sudo passwd -u admin")
        self.assertIn("[Этап 7 пройден", self.defend())

    def test_answer_needs_output_and_stage_asks_control_questions(self):
        self.run_line("ls -l /var/log")
        out = self.run_line("answer 1.1 {auth_lines}")
        self.assertIn("не встречалось в выводе", out)
        self.run_line("sudo wc -l /var/log/auth.log")
        self.assertIn("верно", self.run_line("answer 1.1 {auth_lines}"))
        self.run_line("sudo tail -n 2 /var/log/auth.log")
        out = self.run_line("answer 1.2 {last_time}")
        self.assertIn("верно", out)
        self.assertIn("[Контрольный вопрос 1 из 2, этап 1]", out)
        self.assertIn("Сначала ответьте на контрольный вопрос", self.run_line("answer 1.1 {auth_lines}") +
                      self.run_line("task"))
        self.assertEqual(self.done(), 0)
        self.assertIn("[Этап 1 пройден", self.defend())

    def test_account_commands(self):
        self.assertIn("недостаточно прав", self.run_line("passwd -l {target}"))
        self.assertIn(" P ", self.run_line("sudo passwd -S {target}"))
        self.run_line("sudo passwd -l {target}")
        self.assertIn(" L ", self.run_line("sudo passwd -S {target}"))
        self.assertIn("27(sudo)", self.run_line("id {target}"))
        self.assertIn("Удаление пользователя", self.run_line("sudo gpasswd -d {target} sudo"))
        self.assertNotIn("sudo", self.run_line("groups {target}"))
        # usermod -G без -a ЗАМЕНЯЕТ дополнительные группы
        self.run_line("sudo usermod -G sudo {target}")
        self.assertEqual(self.run_line("groups {target}"), f"{self.p['target']} : {self.p['target']} sudo")
        self.assertIn("ЦЕЛ", self.run_line("sudo sha256sum /var/log/auth.log > ~/s; sudo sha256sum -c ~/s"))
        self.assertIn(self.p["attacker_ip"], self.run_line("last"))
        self.assertIn("Отказано в доступе", self.run_line("lastb"))


SSH = [
    "systemctl status ssh", "sudo sshd -T", "sudo grep -r Port /etc/ssh", "cat /etc/passwd", "answer 1.1 {port}", "answer 1.2 yes",
    "answer 1.3 /etc/ssh/sshd_config.d/50-cloud-init.conf",
    "getent group sshadmins", "answer 2.1 2", "answer 2.2 intern",
    "sudo cp -r /etc/ssh /etc/ssh.bak",
    "cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys", "chmod 700 ~/.ssh", "chmod 600 ~/.ssh/authorized_keys",
    "ssh -p {port} -i ~/.ssh/id_ed25519 {user}@localhost",
    "sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config",
    "sudo sed -i 's/^PermitEmptyPasswords .*/PermitEmptyPasswords no/' /etc/ssh/sshd_config",
    "sudo sed -i 's/^MaxAuthTries .*/MaxAuthTries 3/' /etc/ssh/sshd_config",
    "sudo rm /etc/ssh/sshd_config.d/50-cloud-init.conf",
    "sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config",
    "echo 'AllowGroups sshadmins' | sudo tee -a /etc/ssh/sshd_config",
    "sudo sshd -t", "sudo systemctl reload ssh",
    "ssh -p {port} {user}@localhost", "ssh -p {port} -o PubkeyAuthentication=no {user}@localhost",
    "ssh -p {port} root@localhost", "ssh -p {port} intern@localhost",
]


class SshTests(LabCase):
    GEN = generate_ssh

    def test_reference_walkthrough(self):
        out = self.run_all(SSH)
        self.assertIn("задание №7 засчитано", out)
        self.assertEqual(self.done(), 7)

    def test_initial_server_is_insecure(self):
        self.assertIn("Connection refused", self.run_line("ssh root@localhost"))
        self.assertIn("способ входа: пароль", self.run_line("ssh -p {port} root@localhost"))
        self.assertIn("способ входа: пароль", self.run_line("ssh -p {port} intern@localhost"))
        self.assertIn("passwordauthentication yes", self.run_line("sudo sshd -T"))
        self.assertIn("no hostkeys", self.run_line("sshd -t"))

    def test_strict_modes_and_dropin_trap(self):
        self.run_all(SSH[:12])
        out = self.run_line("ssh -p {port} -i ~/.ssh/id_ed25519 {user}@localhost")
        self.assertIn("способ входа: пароль", out, "~/.ssh с правами 775: ключ отвергнут")
        self.assertIn("bad ownership or modes", self.run_line("sudo tail -n 3 /var/log/auth.log"))
        self.assertEqual(self.done(), 3)
        self.run_all(SSH[12:15])
        self.assertEqual(self.done(), 4)
        # PasswordAuthentication no в основном файле не действует, пока в sshd_config.d стоит yes
        self.run_all(SSH[15:18] + SSH[19:21])
        check = self.run_line("check")
        self.assertIn("50-cloud-init.conf", check)
        self.assertEqual(self.done(), 4)
        self.run_line(SSH[18])
        self.defend()
        self.assertEqual(self.done(), 5)

    def test_edit_needs_reload_and_restart_with_error_stops_service(self):
        self.run_line("sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config")
        self.assertIn("способ входа: пароль", self.run_line("ssh -p {port} root@localhost"), "без reload не применено")
        self.run_line("sudo systemctl reload ssh")
        self.assertIn("Permission denied", self.run_line("ssh -p {port} root@localhost"))
        self.run_line("echo 'PermitRootLogn no' | sudo tee -a /etc/ssh/sshd_config")
        self.assertIn("Bad configuration option: PermitRootLogn", self.run_line("sudo sshd -t"))
        self.assertIn("failed", self.run_line("sudo systemctl reload ssh"))
        self.assertEqual(self.run_line("systemctl is-active ssh"), "active", "reload с ошибкой не останавливает службу")
        self.run_line("sudo systemctl restart ssh")
        self.assertEqual(self.run_line("systemctl is-active ssh"), "failed")
        self.assertIn("Connection refused", self.run_line("ssh -p {port} intern@localhost"))
        self.run_line("sudo sed -i '/^PermitRootLogn/d' /etc/ssh/sshd_config")
        self.run_line("sudo systemctl start ssh")
        self.assertEqual(self.run_line("systemctl is-active ssh"), "active")

    def test_admin_lockout_is_critical(self):
        self.run_all(SSH[:23])
        self.assertEqual(self.done(), 6)
        out = self.run_line("sudo systemctl stop ssh")
        self.assertIn("[Внимание, критично]", out)
        self.run_all(SSH[23:])
        self.assertEqual(self.done(), 6)
        self.run_line("sudo systemctl start ssh")
        self.run_all(SSH[23:])
        self.assertEqual(self.done(), 7)

    def test_sshd_model(self):
        eff, errors = sshd_sim.file_effective(self.root)
        self.assertEqual(errors, [])
        self.assertEqual(eff["port"], str(self.p["port"]))
        self.assertEqual(eff["passwordauthentication"], "yes")
        _, origins, _ = sshd_sim.parse(self.root)
        self.assertEqual(origins["passwordauthentication"][0], "/etc/ssh/sshd_config.d/50-cloud-init.conf")
        key = (self.root / f"home/{STUDENT}/.ssh/id_ed25519").read_text()
        pub = (self.root / f"home/{STUDENT}/.ssh/id_ed25519.pub").read_text()
        self.assertEqual(sshd_sim.pub_blob(sshd_sim.derive_pub(key)), sshd_sim.pub_blob(pub))
        self.assertEqual(self.run_line("ssh-keygen -y -f ~/.ssh/id_ed25519").split()[:2], pub.split()[:2])


class TaskTextTests(unittest.TestCase):
    def test_task_markdown_and_titles(self):
        for key in ("incident", "ssh"):
            lab = lab_task.get(key)
            params = {"port": 2222, "target": "webops", "file": "/srv/x", "attacker_ip": "1.2.3.4"}
            md = lab.task_markdown(params, STUDENT)
            self.assertIn(f"# Задание №{lab.number}. {lab.title}", md)
            for k, stage in enumerate(lab.stages, 1):
                self.assertIn(f"## Этап {k}. {stage['title']}", md)


if __name__ == "__main__":
    unittest.main()
