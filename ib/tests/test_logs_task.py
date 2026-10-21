"""
Тесты задания №8 «Расследование по журналам» (server/logs_task.py, генератор
ctf/logs/generate_logs.py, команды server/cmd_logs.py и доработки движка lab_task.py):
данные однозначны, эталонное прохождение через терминал на 100 баллов, доказательство ответа
выводом команд, ловушки, пауза после ошибок, контрольные вопросы, дежурство SOC.

Работают только с временными каталогами и временной БД — реальные данные не трогаются.
"""

import gzip
import json
import os
import random
import re
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(IB_DIR / "ctf"))
sys.path.insert(0, str(IB_DIR / "ctf" / "logs"))

import app  # noqa: E402
import cmd_logs  # noqa: E402
import generate_logs  # noqa: E402
import lab_task  # noqa: E402
import logs_task  # noqa: E402

STUDENT = "st-logs"


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


class LogsCase(unittest.TestCase):
    SEED = 7

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.lab = logs_task.LAB
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'IB')", (STUDENT,))
        conn.execute("CREATE TABLE ib_logs_detector (student_id TEXT PRIMARY KEY, passed INTEGER, total INTEGER, "
                     "solved INTEGER, defense_ok INTEGER)")
        lab_task.ensure_tables(conn)
        rng = random.Random(self.SEED)
        self.root = base / "logs" / STUDENT
        params = generate_logs.build(self.root, STUDENT, generate_logs.make_params(rng, STUDENT), rng)
        self.lab.insert_row(conn, STUDENT, params)
        conn.commit()
        conn.close()
        self.p = params
        self.saved = (app.MDTASK_DB, app.CTF_LABS_DIR, lab_task.NOW)
        self.clock = Clock(2_000_000_000.0)
        lab_task.NOW = self.clock
        app.MDTASK_DB, app.CTF_LABS_DIR = self.db, base
        self.session = app.SESSIONS[app.new_session(STUDENT, "logs")]

    def tearDown(self):
        app.MDTASK_DB, app.CTF_LABS_DIR, lab_task.NOW = self.saved
        app.SESSIONS.clear()
        for dirpath, dirnames, _ in os.walk(self.tmp.name):
            for d in dirnames:
                p = os.path.join(dirpath, d)
                if not os.path.islink(p):
                    os.chmod(p, 0o755)
        self.tmp.cleanup()

    # ------------------------------------------------------------ помощники ---

    def sh(self, line):
        return app.run_line(self.session, line) or ""

    def progress(self):
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        try:
            return lab_task.load_progress(self.lab.load_row(conn, STUDENT))
        finally:
            conn.close()

    def done(self):
        return self.progress()["done"]

    def defend(self, wrong=False):
        """Ответить на все контрольные вопросы текущего этапа."""
        for _ in range(3):
            pr = self.progress()
            k = pr["done"] + 1
            state = (pr.get("defense") or {}).get(str(k))
            if not state or state["i"] >= len(state["qs"]):
                return
            q = state["qs"][state["i"]]
            choice = (q["correct"] + 1) % len(q["options"]) if wrong else q["correct"]
            self.sh(f"answer q {choice + 1}")

    def answer(self, qid, value):
        out = self.sh(f"answer {qid} {value}")
        self.assertIn("верно", out, f"{qid}={value}: {out}")
        return out

    # ------------------------------------------------------------- этапы ---

    def stage1(self):
        self.assertIn("access.log.2.gz", self.sh("ls /var/log/nginx"))
        self.answer("1.1", 3)
        self.assertIn("Etc/UTC", self.sh("cat /etc/timezone"))
        self.answer("1.2", "UTC")
        first = self.sh("sudo zcat /var/log/nginx/access.log.2.gz | head -n 1")
        m = re.search(r"\[(\d\d)/(\w{3})/(\d{4}):(\d\d:\d\d:\d\d)", first)
        date = f"{m.group(3)}-{cmd_logs.MONTHS.index(m.group(2)) + 1:02d}-{m.group(1)} {m.group(4)}"
        self.answer("1.3", date)

    def stage2(self):
        out = self.sh("sudo cat /var/log/auth.log.1 /var/log/auth.log | grep 'Failed password for' | grep -v invalid "
                       "| grep -o 'from [0-9.]*' | sort | uniq -c | sort -n | tail -n 1")
        ip = out.split()[-1]
        self.answer("2.1", ip)
        out = self.sh(f"sudo cat /var/log/auth.log.1 /var/log/auth.log | grep Accepted | grep {ip}")
        user = re.search(r"Accepted password for (\S+)", out).group(1)
        self.answer("2.2", user)
        count = self.sh(f"sudo cat /var/log/auth.log.1 /var/log/auth.log | grep -c 'Failed password for {user} from {ip} '")
        self.answer("2.3", count.strip())
        out = self.sh(f"sudo grep -- '- {user} \\[' /var/log/nginx/access.log | grep -o '\"[0-9., ]*\" rt=' "
                       "| sort | uniq -c")
        web = re.search(r"\"[0-9.]+, ([0-9.]+)\"", out).group(1)
        self.answer("2.4", web)
        out = self.sh(f"sudo grep EXPORT {self.p['app_log']}")
        self.answer("2.5", re.search(r"rows=(\d+)", out).group(1))

    def stage3(self):
        self.assertIn("A)", self.sh("timeline"))
        self.answer("3.1", self.p["timeline_order"])
        out = self.sh(f"sudo grep 'Accepted password for {self.p['target']}' /var/log/auth.log")
        utc = re.search(r"(\d\d:\d\d:\d\d)", out).group(1)
        local = self.sh(f"TZ=Asia/Tashkent date -d '2026-11-18 {utc} UTC' +%H:%M:%S").strip()
        self.answer("3.2", local)
        out = self.sh("sudo grep COMMAND /var/log/auth.log | head -n 1")
        utc = re.search(r"(\d\d:\d\d:\d\d)", out).group(1)
        self.answer("3.3", self.sh(f"TZ=Asia/Tashkent date -d '2026-11-18 {utc} UTC' +%T").strip())

    def stage4(self):
        n = self.sh("sudo grep -vc 'rt=' /var/log/nginx/access.log").strip()
        self.answer("4.1", n)
        out = self.sh("sudo grep -v 'rt=' /var/log/nginx/access.log | cut -d' ' -f1 | sort | uniq -c | sort -n")
        framed = [x for x in re.findall(r"\d+ (\S+)", out) if x != "10.10.0.2"][-1]
        self.answer("4.2", framed)
        self.answer("4.3", 1)
        self.answer("4.4", self.p["web_ip"])

    def stage5(self):
        out = self.sh(f"sudo journalctl --verify --file {self.p['app_log']}")
        bad = [int(x) for x in re.findall(r"seq=(\d+)", out)]
        deleted = 0
        tampered = None
        for seq in bad:
            around = self.sh(f"sudo grep -B1 'seq={seq} ' {self.p['app_log']}")
            before = int(re.findall(r"seq=(\d+)", around)[0])
            if before == seq - 1:
                tampered = seq - 1
            else:
                deleted += seq - before - 1
        self.answer("5.1", deleted)
        self.answer("5.2", tampered)
        g1 = self.sh(f"sudo grep -B1 'seq={bad[0]} ' {self.p['app_log']}")
        times = re.findall(r"^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)", g1, re.M)
        rows = self.sh(f"sudo grep ',DELETE,' {self.p['audit']}").splitlines()
        inside = [r for r in rows if times[0] < r[:19] < times[1]]
        self.answer("5.3", len(inside))

    def stage6(self):
        self.assertIn("началась", self.sh("duty start"))
        start = self.progress()["duty"]["start"]
        plan = logs_task.shift_plan(self.p, 1, start)
        self.clock.t = plan["attack_at"] + 90
        self.sh("sudo tail -n 5 /var/log/nginx/access.log")
        for ip in plan["ips"]:
            self.sh(f"sudo iptables -A INPUT -s {ip} -j DROP")
        os.utime(self.root / cmd_logs.RULES, (self.clock.t, self.clock.t))
        self.clock.t += 30
        self.sh("sudo iptables -L -n")
        word = {"bruteforce": "перебор паролей", "scan": "сканирование", "exfil": "выгрузка данных"}[plan["type"]]
        self.answer("6.1", word)
        self.assertIn("сдана", self.sh("duty end"))

    def stage7(self):
        conn = sqlite3.connect(self.db)
        conn.execute("INSERT INTO ib_logs_detector VALUES (?, 8, 8, 1, 1)", (STUDENT,))
        conn.commit()
        conn.close()
        self.sh("check")

    def stage8(self):
        lines = [f"Адрес атаки (SSH): {self.p['ssh_ip']}", f"Адрес атаки (веб): {self.p['web_ip']}",
                 f"Учётная запись: {self.p['target']}", f"Вход по SSH (+05): {self.p['ssh_login_local']}",
                 f"Выгружено записей: {self.p['export_rows']}", f"Удалено записей журнала: {self.p['deleted_lines']}",
                 "Меры: заблокированы адреса, учётная запись отключена, данные восстановлены из резервной копии",
                 "Рекомендации: вход по SSH только по ключу, fail2ban, неизменяемое хранилище журналов"]
        for line in lines:
            self.sh(f"echo '{line}' >> ~/report.md")


class GeneratorTests(unittest.TestCase):
    def test_data_matches_answers_on_many_seeds(self):
        for seed in range(12):
            with tempfile.TemporaryDirectory() as tmp:
                rng = random.Random(seed)
                root = Path(tmp)
                p = generate_logs.build(root, "st-g", generate_logs.make_params(rng, "st-g"), rng)
                auth1 = (root / "var/log/auth.log.1").read_text()
                auth0 = (root / "var/log/auth.log").read_text()
                needle = f"Failed password for {p['target']} from {p['ssh_ip']} "
                self.assertEqual(p["bf_split"], [auth1.count(needle), auth0.count(needle)], seed)
                self.assertTrue(all(p["bf_split"]), "подбор должен переходить через ротацию")
                access = (root / "var/log/nginx/access.log").read_text().splitlines()
                self.assertEqual(sum("rt=" not in x for x in access), p["fake_count"])
                self.assertTrue(any(p["framed_ip"] in x and "AI" in x for x in access), "ловушка в журнале")
                app_log = (root / p["app_log"].lstrip("/")).read_text()
                bad = cmd_logs.verify_chain(app_log)
                self.assertEqual(bad, [p["gaps"][0][1], p["gaps"][1][1], p["tampered_seq"] + 1], seed)
                seqs = [int(x) for x in re.findall(r"seq=(\d+)", app_log)]
                self.assertEqual(max(seqs) - len(seqs), p["deleted_lines"])
                first = gzip.decompress((root / "var/log/nginx/access.log.2.gz").read_bytes()).decode().split("\n")[0]
                self.assertIn(p["first_nginx_tok"][0], first)
                for name in ("access.log", "access.log.1"):
                    self.assertLess((root / "var/log/nginx" / name).stat().st_size, 5 * 1024 * 1024)
                self.assertGreater(len(access), 8000, "журнал не должен помещаться в чат")
                self.assertEqual(len(set(p["timeline_order"])), 8)
                last = (auth0.strip().splitlines() or [""])[-1]
                self.assertLess(last[:15], "Nov 19 06:00:00", "в auth.log нет записей после снятия журналов (11:00 +05)")


class WalkthroughTests(LogsCase):
    def test_full_walkthrough_scores_100(self):
        for k, stage in enumerate([self.stage1, self.stage2, self.stage3, self.stage4, self.stage5], 1):
            stage()
            out = self.sh("task")
            self.assertIn("Контрольный вопрос", out, f"этап {k}")
            self.defend()
            self.sh("check")
            self.assertEqual(self.done(), k, f"этап {k}")
        self.stage6()
        self.defend()
        self.sh("check")
        self.assertEqual(self.done(), 6)
        self.stage7()
        self.assertEqual(self.done(), 7)
        self.stage8()
        self.sh("check")
        pr = self.progress()
        self.assertEqual(pr["done"], 8)
        self.assertEqual(pr["score"]["total"], 100, json.dumps(pr["score"], ensure_ascii=False))
        self.assertFalse(pr.get("traps"))

    def test_wrong_defense_halves_stage(self):
        self.stage1()
        self.defend(wrong=True)
        self.sh("check")
        pr = self.progress()
        self.assertEqual(pr["done"], 1)
        self.assertEqual(pr["score"]["stages"][0]["points"], 5)
        self.assertEqual(pr["score"]["stages"][0]["defense"], "частично")

    def test_late_defense_answer_is_wrong(self):
        self.stage1()
        state = self.progress()["defense"]["1"]
        self.clock.t += 61
        out = self.sh(f"answer q {state['qs'][0]['correct'] + 1}")
        self.assertIn("Время вышло", out)


class ProofAndTrapTests(LogsCase):
    def test_answer_without_own_output_is_refused(self):
        self.stage1()
        self.defend()
        self.sh("check")
        out = self.sh(f"answer 2.1 {self.p['ssh_ip']}")
        self.assertIn("не встречалось в выводе", out)
        self.sh(f"echo {self.p['ssh_ip']}")
        self.assertIn("не встречалось", self.sh(f"answer 2.1 {self.p['ssh_ip']}"))
        self.sh(f"sudo grep -c 'from {self.p['ssh_ip']} ' /var/log/auth.log")   # адрес набран сам
        self.assertIn("не встречалось", self.sh(f"answer 2.1 {self.p['ssh_ip']}"))
        self.assertEqual(len(self.progress()["no_proof"]), 3)

    def test_traps_are_recorded(self):
        self.assertIn("неверно", self.sh("answer 1.2 UTC+3"))
        self.stage1()
        self.defend()
        self.sh("check")
        self.sh(f"answer 2.1 {self.p['clip_ip']}")
        self.sh(f"answer 2.1 {self.p['framed_ip']}")
        traps = [t["trap"] for t in self.progress()["traps"]]
        self.assertEqual(traps, ["clip_utc3", "clip_ip", "injected_note"])

    def test_pause_after_three_wrong_answers(self):
        for _ in range(3):
            self.sh("answer 1.1 7")
        self.assertIn("пауза", self.sh("answer 1.1 3"))
        self.clock.t += 121
        self.assertIn("верно", self.sh("answer 1.1 3"))


class DutyTests(LogsCase):
    def open_duty(self):
        for stage in (self.stage1, self.stage2, self.stage3, self.stage4, self.stage5):
            stage()
            self.defend()
            self.sh("check")
        self.assertEqual(self.done(), 5)

    def test_log_grows_and_blocking_stops_attack(self):
        self.open_duty()
        before = (self.root / "var/log/nginx/access.log").stat().st_size
        self.sh("duty start")
        plan = logs_task.shift_plan(self.p, 1, self.progress()["duty"]["start"])
        self.clock.t = plan["attack_at"] + 120
        self.sh("duty status")
        self.assertGreater((self.root / "var/log/nginx/access.log").stat().st_size, before)
        logs = (self.root / "var/log/nginx/access.log").read_text() + (self.root / "var/log/auth.log").read_text()
        self.assertIn(plan["ips"][0], logs)
        for ip in plan["ips"]:
            self.sh(f"sudo iptables -A INPUT -s {ip} -j DROP")
        count = logs.count(plan["ips"][0])
        self.clock.t += 300
        self.sh("duty status")
        logs = (self.root / "var/log/nginx/access.log").read_text() + (self.root / "var/log/auth.log").read_text()
        self.assertEqual(logs.count(plan["ips"][0]), count, "после блокировки атака не пишется")

    def test_blocking_allowlist_fails_shift(self):
        self.open_duty()
        self.sh("duty start")
        plan = logs_task.shift_plan(self.p, 1, self.progress()["duty"]["start"])
        self.clock.t = plan["attack_at"] + 60
        for ip in plan["ips"] + ["10.20.0.250"]:
            self.sh(f"sudo iptables -A INPUT -s {ip} -j DROP")
        out = self.sh("duty end")
        self.assertIn("не сдана", out)
        self.assertIn("10.20.0.250", out)
        self.assertEqual(self.done(), 5)

    def test_shift_ends_by_time(self):
        self.open_duty()
        self.sh("duty start")
        self.clock.t += logs_task.DUTY_MINUTES * 60 + 5
        self.sh("ls")
        self.assertIn("не сдана", self.sh("duty status"))


class CommandTests(unittest.TestCase):
    def test_score_table_is_100(self):
        self.assertEqual(sum(logs_task.POINTS), 100)

    def test_mdtask_stage_titles_match(self):
        text = (IB_DIR.parent / "src" / "lib" / "ib-tasks.js").read_text(encoding="utf-8")
        block = text[text.index("key: 'logs'"):]
        start = block.index("stages: [")
        block = block[start:block.index("],", start)]
        titles = re.findall(r"'([^']+)'", block)
        self.assertEqual(titles, [s["title"] for s in logs_task.STAGES])


if __name__ == "__main__":
    unittest.main()
