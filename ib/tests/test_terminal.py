"""
Тесты задания №5 «Основы работы в терминале Linux»: новые команды эмулятора (cmd_files.py,
история, скрипты, Tab) и тренажёр (server/terminal_task.py, ctf/terminal/generate_terminal.py,
checks/task5_check.py) — эталонное прохождение, порядок этапов, ловушки.

Работают только с временными каталогами и временной БД — реальные данные не трогаются.
"""

import contextlib
import io
import json
import os
import random
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(IB_DIR / "ctf" / "terminal"))
sys.path.insert(0, str(IB_DIR / "checks"))

import app  # noqa: E402
import cmd_files  # noqa: E402
import generate_terminal  # noqa: E402
import shell  # noqa: E402
import task5_check  # noqa: E402
import terminal_task as tt  # noqa: E402
from vfs import Sandbox  # noqa: E402

STUDENT = "st-t5"


class Term:
    def __init__(self, root, user="student"):
        home = f"home/{user}"
        Path(root, home).mkdir(parents=True, exist_ok=True)
        self.sb = Sandbox(root, user, home, mapped_home=False, writable=True)
        self.session = {"student_id": user, "cwd": home, "sandbox": self.sb}

    def __call__(self, line):
        line, err = shell.expand_history(self.session, line)
        if err:
            return err
        shell.add_history(self.session, line)
        ctx = shell.Ctx(self.session, self.sb)
        out = shell.run(ctx, line)
        self.session["last_status"] = ctx.status
        self.status = ctx.status
        self.ctx = ctx
        return out


class FileCommandTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        Path(self.root, "etc").mkdir()
        Path(self.root, "etc/hostname").write_text("seclab\n")
        self.t = Term(self.root)

    def tearDown(self):
        for dirpath, dirnames, _ in os.walk(self.root):
            for d in dirnames:
                p = os.path.join(dirpath, d)
                if not os.path.islink(p):
                    os.chmod(p, 0o755)
        self.tmp.cleanup()

    def test_mkdir_touch_tree(self):
        t = self.t
        self.assertIn("Нет такого файла", t("mkdir a/b"))
        self.assertEqual(t("mkdir -p a/b/c && mkdir -v a/d"), "mkdir: создан каталог 'a/d'")
        self.assertIn("Файл существует", t("mkdir a"))
        t("touch a/b/c/f.txt")
        self.assertEqual(t("tree a"), "a\n├── b\n│   └── c\n│       └── f.txt\n└── d\n\n3 каталога, 1 файл")
        self.assertIn("Отказано в доступе", t("mkdir /etc/x"))
        self.assertEqual(t("sudo mkdir /etc/x; ls -d /etc/x"), "/etc/x")

    def test_rm_rmdir_and_protection(self):
        t = self.t
        t("mkdir -p d/sub; touch d/sub/f d/x.tmp d/y.tmp d/keep")
        self.assertIn("Это каталог", t("rm d"))
        self.assertIn("Каталог не пуст", t("rmdir d/sub"))
        t("rm d/*.tmp")
        self.assertEqual(t("ls d"), "keep\nsub/".replace("\n", "  "))
        t("rm -r d/sub")
        self.assertEqual(t("ls d"), "keep")
        self.assertIn("запрещено", t("rm -rf ~"))
        self.assertIn("опасно", t("sudo rm -rf /"))
        self.assertIn("Отказано в доступе", t("rm /etc/hostname"))
        self.assertEqual(t("rm -f nothing; echo $?"), "0")
        self.assertIn("интерактивный", t("rm -i d/keep"))

    def test_cp_mv(self):
        t = self.t
        t("mkdir -p src/in; echo hi > src/in/a.txt; echo top > src/b.txt; ln -s b.txt src/link")
        self.assertIn("не указан -r", t("cp src dst"))
        t("cp -r src dst")
        self.assertEqual(t("cat dst/in/a.txt; readlink dst/link"), "hi\nb.txt")
        self.assertIn("в самого себя", t("cp -r src src/in"))
        t("mkdir box; mv src/b.txt box/; mv box/b.txt box/c.txt")
        self.assertEqual(t("ls box; ls src/b.txt 2>/dev/null; echo $?"), "c.txt\n2")
        self.assertIn("подкаталог самого себя", t("mv src src/in"))
        self.assertIn("запрещено", t("mv ~ /tmp"))

    def test_chmod_modes(self):
        f = cmd_files.apply_mode
        self.assertEqual(f("755", 0o644, False), 0o755)
        self.assertEqual(f("u+x", 0o644, False), 0o744)
        self.assertEqual(f("+x", 0o644, False), 0o755)
        self.assertEqual(f("go-rwx", 0o755, False), 0o700)
        self.assertEqual(f("u=rw,g=r,o=", 0o777, False), 0o640)
        self.assertEqual(f("a+X", 0o644, True), 0o755)
        self.assertEqual(f("a+X", 0o644, False), 0o644)
        self.assertIsNone(f("z+q", 0o644, False))
        t = self.t
        t("echo x > f")
        self.assertEqual(t("chmod -v 600 f"), "права доступа 'f' изменены с 0644 (rw-r--r--) на 0600 (rw-------)")
        self.assertIn("Операция не позволена", t("chmod 777 /etc/hostname"))
        t("sudo chmod 600 /etc/hostname")
        self.assertIn("Отказано в доступе", t("cat /etc/hostname"))

    def test_links(self):
        t = self.t
        t("ln -s /etc/hostname h; ln -s h h2")
        self.assertRegex(t("ls -l h"), r"^lrwx.* 13 .* h -> /etc/hostname$")
        self.assertEqual(t("cat h2; readlink h; readlink -f h2"), "seclab\n/etc/hostname\n/etc/hostname")
        self.assertIn("Файл существует", t("ln -s /etc/hostname h"))
        t("ln -sf /etc h")
        self.assertEqual(t("readlink h"), "/etc")
        self.assertEqual(t("file h"), "h: symbolic link to /etc")

    def test_scripts_need_x_bit(self):
        t = self.t
        Path(self.root, "home/student/s.sh").write_text("#!/bin/bash\necho start\nmkdir -p out\ncd out\npwd\n")
        self.assertIn("Отказано в доступе", t("./s.sh"))
        self.assertEqual(t.status, 126)
        self.assertEqual(t("bash s.sh"), "start\n/home/student/out")
        t("chmod u+x s.sh")
        self.assertEqual(t("./s.sh; pwd"), "start\n/home/student/out\n/home/student")
        self.assertIn("Bourne-Again shell script", t("file s.sh"))

    def test_history_expansion(self):
        t = self.t
        t("echo one")
        t("pwd")
        self.assertEqual(t("!!"), "/home/student")
        self.assertEqual(t("!echo"), "one")
        self.assertEqual(t("!1"), "one")
        self.assertIn("событие не найдено", t("!99"))
        self.assertEqual(t("echo '!!'"), "!!")
        self.assertIn("    1  echo one", t("history"))
        self.assertEqual(t("find . -maxdepth 0 ! -name x"), ".")

    def test_tab_completion(self):
        t = self.t
        t("mkdir -p documents downloads; touch notes.txt .hidden")
        ctx = shell.Ctx(t.session, t.sb)
        self.assertEqual(shell.complete(ctx, "cd doc"), {"line": "cd documents/", "options": []})
        self.assertEqual(shell.complete(ctx, "cat no"), {"line": "cat notes.txt ", "options": []})
        self.assertEqual(shell.complete(ctx, "ls do"), {"line": "ls do", "options": ["documents/", "downloads/"]})
        self.assertEqual(shell.complete(ctx, "ls ."), {"line": "ls .hidden ", "options": []})
        self.assertEqual(shell.complete(ctx, "chm"), {"line": "chmod ", "options": []})
        self.assertEqual(shell.complete(ctx, "man chm"), {"line": "man chmod ", "options": []})
        self.assertEqual(shell.complete(ctx, "sudo whoa"), {"line": "sudo whoami ", "options": []})
        self.assertEqual(shell.complete(ctx, "cat /etc/host"), {"line": "cat /etc/hostname ", "options": []})


# ================================================================ тренажёр ===

def reference(p, user):
    """Эталонное прохождение всех этапов (с одной ошибкой на каждую ловушку)."""
    pr = p["project"]
    return [
        "pwd", "whoami", "date", "man ls",
        "ls -l", "ls -la", "ls -l /etc", "answer 2.1 0", f"answer 2.1 {p['hidden_count']}",
        "cd /var/log", "cd ..", "cd", "cd documents/letters", "cd -",
        "cat ~/documents/notes.txt", "head -n 5 ~/logs/app.log", "tail -3 logs/app.log", "wc -l logs/app.log",
        f"answer 4.1 {p['app_log_lines']}", "cat .secret", f"answer 4.2 {p['code_word']}",
        f"mkdir {pr}", f"mkdir -p {pr}/src/utils", f"echo '# {pr}' > {pr}/README.md",
        f"echo 'Автор: {user}' >> {pr}/README.md", f"touch {pr}/src/main.py {pr}/src/utils/helpers.py",
        f"mkdir {pr}/docs {pr}/data", f"cp documents/report.txt {pr}/docs/", f"cp -r downloads/config {pr}/config",
        f"mv downloads/data.csv {pr}/data/", f"mv {pr}/src/main.py {pr}/src/app.py",
        "rm trash/*.tmp", "rmdir trash/empty_dir", "rm -r trash/old_project",
        "cd scripts", "./backup.sh", "chmod +x backup.sh", "./backup.sh", "cd",
        "chmod 600 documents/private.txt", f"answer 8.1 {p['mystery_mode']}",
        f"ln -s ~/logs/app.log {pr}/latest.log", "ln -s ~/documents docs", "readlink downloads/current",
        f"answer 9.1 {p['release']}",
        "find ~/archive -name '*.pdf'", f"answer 10.1 ~/{p['pdf_path']}", "grep -c ERROR logs/app.log",
        f"answer 10.2 {p['error_count']}",
        f"answer 10.3 {p['keyword_file'].rsplit('/', 1)[1]}",
        "cut -d' ' -f1 logs/access.log | sort | uniq -c | sort -n | tail -n 1", f"answer 11.1 {p['top_ip']}", f"cut -d' ' -f1 logs/access.log | sort -u > {pr}/ips.txt",
        f"grep ERROR logs/app.log > {pr}/errors.txt", "find / -name '*.log' 2>/dev/null",
        "cat /var/log/auth.log", "sudo !!", "sudo whoami", f"answer 12.1 {p['auth_user']}",
        f"sudo echo 'Сервер обслуживает: {user}' >> /etc/motd",
        f"echo 'Сервер обслуживает: {user}' | sudo tee -a /etc/motd",
        "history", "ls", "!!", "history | grep cd",
        "mkdir -p final/bin final/conf final/logs",
        f"printf 'name=%s\\nport=%s\\n' {pr} {p['final_port']} > final/conf/app.conf",
        "cp scripts/backup.sh final/bin/start.sh", "chmod 750 final/bin/start.sh",
        "ln -s ~/logs/app.log final/logs/current.log", "grep -c WARN logs/app.log > final/logs/warnings.txt",
        "rm -rf trash",
    ]


class TrainerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.db = str(base / "mdtask.db")
        self.out = base / "terminal"
        conn = sqlite3.connect(self.db)
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT, name TEXT, student_group TEXT, "
                     "password_hash TEXT, password_salt TEXT, must_change_password INTEGER DEFAULT 0)")
        conn.execute("INSERT INTO users (id, role, name, student_group) VALUES (?, 'student', 'Тест', 'IB')", (STUDENT,))
        tt.ensure_tables(conn)
        params = generate_terminal.build(self.out / STUDENT, STUDENT, generate_terminal.make_params(random.Random(5)),
                                         random.Random(5))
        tt.insert_row(conn, STUDENT, params)
        conn.commit()
        conn.close()
        self.params = params
        self.saved = (app.MDTASK_DB, app.CTF_TERMINAL_DIR)
        app.MDTASK_DB, app.CTF_TERMINAL_DIR = self.db, self.out
        self.session = app.SESSIONS[app.new_session(STUDENT, "terminal")]

    def tearDown(self):
        app.MDTASK_DB, app.CTF_TERMINAL_DIR = self.saved
        app.SESSIONS.clear()
        for dirpath, dirnames, _ in os.walk(self.tmp.name):
            for d in dirnames:
                p = os.path.join(dirpath, d)
                if not os.path.islink(p):
                    os.chmod(p, 0o755)
        self.tmp.cleanup()

    def run_line(self, line):
        return app.run_line(self.session, line) or ""

    def defend(self):
        """Верно ответить на контрольные вопросы этапа, если они заданы. -> их вывод."""
        out = ""
        for _ in range(3):
            progress = tt.load_progress(self.row())
            state = (progress.get("defense") or {}).get(str(progress["done"] + 1))
            if not state or state["i"] >= len(state["qs"]):
                break
            out += "\n" + self.run_line(f"answer q {state['qs'][state['i']]['correct'] + 1}")
        return out

    def row(self):
        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        try:
            return tt.load_row(conn, STUDENT)
        finally:
            conn.close()

    def test_task_md_lists_every_stage_with_personal_values(self):
        text = (self.out / STUDENT / "home" / STUDENT / "TASK.md").read_text(encoding="utf-8")
        for k, stage in enumerate(tt.STAGES, 1):
            self.assertIn(f"## Этап {k}. {stage['title']}", text)
        self.assertIn(self.params["project"], text)
        self.assertIn(str(self.params["final_port"]), text)
        self.assertNotIn(self.params["code_word"], text)

    def test_reference_walkthrough_solves_every_stage(self):
        messages = []
        for line in reference(self.params, STUDENT):
            out = self.run_line(line) + self.defend()
            messages += [m for m in out.split("\n") if m.startswith("[Этап")]
        self.assertEqual(len(messages), tt.TOTAL, messages)
        row = self.row()
        self.assertEqual((row["passed"], row["total"], row["solved"]), (tt.TOTAL, tt.TOTAL, 1))
        self.assertIn("пройдено этапов 14 из 14", self.run_line("check"))

        conn = sqlite3.connect(self.db)
        conn.row_factory = sqlite3.Row
        report, _ = task5_check.check_student(conn, self.out, STUDENT, False)
        conn.close()
        self.assertTrue(report["solved"])
        self.assertEqual(report["passed_stages"], tt.TOTAL)
        self.assertEqual(report["wrong_answers"], 1)

    def test_stages_go_in_order_and_commands_count_only_after_opening(self):
        self.run_line("ls -la")
        self.run_line("ls -l /etc")
        for line in ("pwd", "whoami", "date"):
            self.run_line(line)
        self.assertIn("контрольные вопросы", self.run_line("man ls"))
        self.assertIn("[Этап 1 пройден", self.defend())
        out = self.run_line(f"answer 2.1 {self.params['hidden_count']}")
        self.assertIn("верно", out)
        self.assertNotIn("Этап 2 пройден", out)
        task = self.run_line("task")
        self.assertIn("✘ 1) Выведите подробный список", task)
        self.assertIn("✔ 4) [2.1]", task)
        self.assertIn("откроется после этапа 2", self.run_line("answer 4.1 10"))
        self.run_line("ls -la")
        self.run_line("ls -l /etc")
        self.assertIn("[Этап 2 пройден", self.defend())
        self.assertIn("▶ 3. Перемещение по каталогам", self.run_line("check"))
        self.assertIn("уже пройден", self.run_line("answer 2.1 5"))

    def test_traps_do_not_count(self):
        p = self.params
        progress = tt.load_progress(None)
        progress["done"] = 11  # сразу на этап 12
        conn = sqlite3.connect(self.db)
        conn.execute("UPDATE ib_terminal_tasks SET progress=?, passed=11 WHERE student_id=?",
                     (json.dumps(progress), STUDENT))
        conn.commit()
        conn.close()
        self.assertIn("Отказано в доступе", self.run_line(f"sudo echo 'Сервер обслуживает: {STUDENT}' >> /etc/motd"))
        self.assertIn("Отказано в доступе", self.run_line("cat /var/log/auth.log"))
        self.assertIn("неверно", self.run_line("answer 12.1 root"))
        self.assertIn("не встречалось в выводе", self.run_line(f"answer 12.1 {p['auth_user']}"))
        self.run_line("sudo cat /var/log/auth.log")
        self.assertIn("верно", self.run_line(f"answer 12.1 {p['auth_user']}"))
        self.run_line("sudo whoami")
        self.assertEqual(self.row()["passed"], 11)
        self.run_line(f"echo 'Сервер обслуживает: {STUDENT}' | sudo tee -a /etc/motd")
        self.assertIn("[Этап 12 пройден", self.defend())

    def test_file_items_check_real_state(self):
        env = tt.Env(self.out / STUDENT, STUDENT, self.params, [], {})
        stage7 = [ok for _, ok in tt.evaluate_stage(7, env)]
        self.assertEqual(stage7, [False, False, False])
        home = self.out / STUDENT / "home" / STUDENT
        os.remove(home / "trash" / "keep.txt")
        for f in (home / "trash").glob("*.tmp"):
            f.unlink()
        self.assertFalse(tt.evaluate_stage(7, env)[0][1], "keep.txt удалён — пункт не засчитан")

    def test_regenerate_keeps_values_when_sandbox_missing(self):
        import shutil
        shutil.rmtree(self.out / STUDENT)
        sys_argv = sys.argv
        sys.argv = ["generate_terminal.py", "--student", STUDENT, "--db", self.db, "--out", str(self.out)]
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                generate_terminal.main()
        finally:
            sys.argv = sys_argv
        params = json.loads(self.row()["params"])
        self.assertEqual(params["project"], self.params["project"])
        self.assertTrue((self.out / STUDENT / "home" / STUDENT / "TASK.md").exists())

    def set_done(self, done):
        progress = tt.load_progress(None)
        progress["done"] = done
        conn = sqlite3.connect(self.db)
        conn.execute("UPDATE ib_terminal_tasks SET progress=?, passed=? WHERE student_id=?",
                     (json.dumps(progress), done, STUDENT))
        conn.commit()
        conn.close()

    def repair(self):
        sys_argv = sys.argv
        sys.argv = ["generate_terminal.py", "--student", STUDENT, "--db", self.db, "--out", str(self.out), "--repair"]
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                generate_terminal.main()
        finally:
            sys.argv = sys_argv
        return out.getvalue()

    def data_item_ok(self):
        row = self.row()
        env = tt.Env(self.out / STUDENT, STUDENT, json.loads(row["params"]), [], {})
        return tt.evaluate_stage(6, env)[2][1]

    def test_repair_returns_lost_data_csv_and_keeps_progress(self):
        proj = self.params["project"]
        self.set_done(5)
        # две команды в одной строке: mkdir создаёт каталог data.csv, mv кладёт файл внутрь, rm -rf удаляет оригинал
        self.run_line(f"mkdir -p ~/{proj}/data mv ~/downloads/data.csv ~/{proj}/data/data.csv")
        self.run_line(f"mv ~/downloads/data.csv ~/{proj}/data/data.csv")
        self.assertIn("это каталог", self.run_line("check"))
        self.run_line(f"rm -rf ~/{proj}/data/data.csv")
        self.run_line(f"touch ~/{proj}/data/data.csv")
        self.assertIn("не совпадает с исходным", self.run_line("task"))
        before = self.row()

        self.assertIn("оригинал потерян", self.repair())
        after = self.row()
        self.assertEqual((after["passed"], after["progress"]), (before["passed"], before["progress"]))
        self.assertNotEqual(json.loads(after["params"])["hashes"]["data"], self.params["hashes"]["data"])
        self.assertFalse(self.data_item_ok())
        self.run_line(f"mv ~/downloads/data.csv ~/{proj}/data/data.csv")
        self.assertTrue(self.data_item_ok())
        self.assertIn("исправлено 0", self.repair())

    def test_repair_moves_original_back_from_wrong_place(self):
        proj = self.params["project"]
        self.set_done(5)
        self.run_line(f"mkdir -p ~/{proj}/data/data.csv")
        self.run_line(f"mv ~/downloads/data.csv ~/{proj}/data/data.csv")
        self.assertIn("оригинал найден", self.repair())
        self.assertEqual(json.loads(self.row()["params"])["hashes"], self.params["hashes"])
        self.run_line(f"mv ~/downloads/data.csv ~/{proj}/data/data.csv")
        self.assertTrue(self.data_item_ok())


if __name__ == "__main__":
    unittest.main()
