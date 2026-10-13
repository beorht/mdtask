"""
Тесты эмулятора терминала (server/shell.py, cmd_find.py, cmd_grep.py, cmd_sed.py) и задания №4.

Запуск из корня mdtask:
    python3 -m unittest discover -s ib/tests -v

Работают только с временными каталогами и временной копией схемы БД — реальные данные
(data/mdtask.db, data/ctf/) не трогаются.
"""

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
sys.path.insert(0, str(IB_DIR / "ctf" / "configs"))

import config_task  # noqa: E402
import generate_configs  # noqa: E402
import shell  # noqa: E402
from vfs import Sandbox  # noqa: E402


def make_tree(root, files):
    for rel, content in files.items():
        p = Path(root, rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")


class Term:
    """Сессия терминала на временной песочнице в режиме «сервер» (как задание №4)."""

    def __init__(self, root, user="student", home=None):
        home = home if home is not None else f"home/{user}"
        Path(root, home).mkdir(parents=True, exist_ok=True)
        self.sb = Sandbox(root, user, home, mapped_home=False, writable=True)
        self.session = {"student_id": user, "cwd": home, "sandbox": self.sb}

    def __call__(self, line):
        ctx = shell.Ctx(self.session, self.sb)
        out = shell.run(ctx, line)
        self.session["last_status"] = ctx.status
        self.status = ctx.status
        return out


class ShellTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        make_tree(self.root, {
            "etc/app/main.conf": "# comment\nPort 22\nName demo\n",
            "etc/app/conf.d/10-extra.conf": "Port 2200\n",
            "etc/app/notes.txt": "port lower\nPORT upper\n",
            "home/student/a.txt": "one\ntwo\nthree\nfour\n",
            "home/student/b.txt": "alpha beta\ngamma\n",
        })
        os.chmod(Path(self.root, "etc/app/main.conf"), 0o644)
        Path(self.root, "etc/secret").mkdir()
        Path(self.root, "etc/secret/key").write_text("k\n")
        os.chmod(Path(self.root, "etc/secret"), 0o700)
        os.symlink("main.conf", Path(self.root, "etc/app/link.conf"))
        self.t = Term(self.root)

    def tearDown(self):
        os.chmod(Path(self.root, "etc/secret"), 0o755)
        self.tmp.cleanup()

    # ---------------------------------------------------------- разбор ---

    def test_quotes_variables_substitution_and_lists(self):
        t = self.t
        self.assertEqual(t("echo 'a  b' \"c $USER\" d\\ e"), "a  b c student d e")
        self.assertEqual(t('echo "$(echo hi) там"'), "hi там")
        self.assertEqual(t("false && echo no || echo yes"), "yes")
        self.assertEqual(t("cd /etc; pwd; cd -"), "/etc\n/home/student")
        self.assertEqual(t("echo ~/x"), "/home/student/x")
        self.assertIn("незакрытая кавычка", t("echo 'oops"))

    def test_globs_expand_and_stay_literal_without_matches(self):
        t = self.t
        self.assertEqual(t("echo *.txt"), "a.txt b.txt")
        self.assertEqual(t("echo '*.txt'"), "*.txt")
        self.assertEqual(t("echo *.nothing"), "*.nothing")
        self.assertEqual(t("ls /etc/app/*.conf"), "/etc/app/link.conf  /etc/app/main.conf")

    def test_pipes_and_redirections(self):
        t = self.t
        self.assertEqual(t("cat a.txt | head -n 2 | tail -n 1"), "two")
        t("grep -n t a.txt > out.txt")
        self.assertEqual(t("cat out.txt"), "2:two\n3:three")
        t("echo five >> a.txt")
        self.assertEqual(t("wc -l < a.txt"), "5")
        self.assertEqual(t("cat /nope 2>/dev/null; echo $?"), "1")
        self.assertIn("нет такого файла", t("cat /nope 2>&1 | head -1"))

    # ------------------------------------------------------------ права ---

    def test_root_files_need_sudo_and_redirect_is_not_sudo(self):
        t = self.t
        self.assertIn("Отказано в доступе", t("sed -i 's/22/23/' /etc/app/main.conf"))
        self.assertIn("Отказано в доступе", t("sudo echo x >> /etc/app/main.conf"))
        t("echo 'Extra yes' | sudo tee -a /etc/app/main.conf > /dev/null")
        self.assertEqual(t("tail -n 1 /etc/app/main.conf"), "Extra yes")
        self.assertIn("Отказано в доступе", t("ls /etc/secret"))
        self.assertEqual(t("sudo ls /etc/secret"), "key")

    def test_cannot_escape_sandbox(self):
        self.assertEqual(self.t("cd /../../..; pwd"), "/")
        os.symlink("/etc", Path(self.root, "home/student/out"))
        self.assertIn("за пределы", self.t("cat ~/out/passwd"))

    # ------------------------------------------------------------- find ---

    def test_find_name_type_path_depth(self):
        t = self.t
        self.assertEqual(t("find /etc/app -name '*.conf' -type f"),
                         "/etc/app/conf.d/10-extra.conf\n/etc/app/main.conf")
        self.assertEqual(t("find /etc/app -type l"), "/etc/app/link.conf")
        self.assertEqual(t("find /etc/app -maxdepth 1 -type d"), "/etc/app\n/etc/app/conf.d")
        self.assertEqual(t("find /etc -path '*conf.d*' -type f 2>/dev/null"), "/etc/app/conf.d/10-extra.conf")
        self.assertEqual(t("find /etc/app -iname 'MAIN*'"), "/etc/app/main.conf")
        self.assertEqual(t("find /etc/app \\( -name '*.txt' -o -name '10-*' \\) -printf '%f\\n'"),
                         "10-extra.conf\nnotes.txt")
        self.assertEqual(t("find /etc/app ! -name '*.conf' -type f"), "/etc/app/notes.txt")
        self.assertEqual(t("find /etc/app -regex '.*\\.\\(txt\\|conf\\)' -type f | wc -l"), "3")

    def test_find_errors_exec_and_perm(self):
        t = self.t
        out = t("find /etc -name key")
        self.assertIn("find: '/etc/secret': Отказано в доступе", out)
        self.assertEqual(t("find /etc -name key 2>/dev/null"), "")
        self.assertEqual(t("sudo find /etc -name key"), "/etc/secret/key")
        self.assertEqual(t("find /etc/app -name '*.conf' -type f -exec grep -l 2200 {} \\;"),
                         "/etc/app/conf.d/10-extra.conf")
        self.assertEqual(t("find /etc/app -type f -name '*.conf' -exec grep -c Port {} +"),
                         "/etc/app/conf.d/10-extra.conf:1\n/etc/app/main.conf:1")
        self.assertEqual(t("find /etc/app -maxdepth 1 -perm 644 -name main.conf"), "/etc/app/main.conf")
        self.assertIn("неизвестный предикат", t("find . -bogus"))
        self.assertEqual(t("find /etc/app -name '*.conf' -type f -print0 | xargs -0 grep -h ^Port"), "Port 2200\nPort 22")

    # ------------------------------------------------------------- grep ---

    def test_grep_options(self):
        t = self.t
        self.assertEqual(t("grep -n Port /etc/app/main.conf"), "2:Port 22")
        self.assertEqual(t("grep -i port /etc/app/notes.txt | wc -l"), "2")
        self.assertEqual(t("grep -v '^#' /etc/app/main.conf"), "Port 22\nName demo")
        self.assertEqual(t("grep -rn '^Port' /etc/app"),
                         "/etc/app/conf.d/10-extra.conf:1:Port 2200\n/etc/app/main.conf:2:Port 22")
        self.assertEqual(t("grep -rl Port /etc/app --include='*.conf'"),
                         "/etc/app/conf.d/10-extra.conf\n/etc/app/main.conf")
        self.assertEqual(t("grep -c o a.txt"), "3")
        self.assertEqual(t("grep -w -o 'beta' b.txt"), "beta")
        self.assertEqual(t("grep -E '^(one|four)$' a.txt"), "one\nfour")
        self.assertEqual(t("grep '^t\\(wo\\|hree\\)$' a.txt"), "two\nthree")
        self.assertEqual(t("grep -A1 two a.txt"), "two\nthree")
        self.assertEqual(t("grep -x two a.txt; echo $?"), "two\n0")
        self.assertEqual(t("grep -q nothing a.txt; echo $?"), "1")
        self.assertEqual(t("grep -F '.' a.txt; echo $?"), "1")
        self.assertIn("Это каталог", t("grep x /etc/app"))

    # -------------------------------------------------------------- sed ---

    def test_sed_print_and_substitute(self):
        t = self.t
        self.assertEqual(t("sed -n '2,3p' a.txt"), "two\nthree")
        self.assertEqual(t("sed -n '/^t/p' a.txt"), "two\nthree")
        self.assertEqual(t("sed 's/o/0/g' a.txt | head -n 2"), "0ne\ntw0")
        self.assertEqual(t("echo aaa | sed 's/a/b/2'"), "aba")
        self.assertEqual(t("echo 'Port 22' | sed -E 's/^(Port) ([0-9]+)$/\\1 =\\2=/'"), "Port =22=")
        self.assertEqual(t("echo hello | sed 's/.*/[&]/'"), "[hello]")
        self.assertEqual(t("echo path | sed 's|path|/var/www|'"), "/var/www")
        self.assertEqual(t("echo word | sed 's/w\\(or\\)d/\\U\\1/'"), "OR")
        self.assertEqual(t("sed '2d;$d' a.txt"), "one\nthree")
        self.assertEqual(t("sed '/two/c ДВА' a.txt | head -n 2"), "one\nДВА")
        self.assertEqual(t("sed '1i top' a.txt | head -n 2"), "top\none")
        self.assertEqual(t("sed '/one/a after' a.txt | head -n 2"), "one\nafter")
        self.assertEqual(t("sed -n '$=' a.txt"), "4")
        self.assertEqual(t("sed '2!d' a.txt"), "two")
        self.assertEqual(t("sed -n '/two/,/three/p' a.txt"), "two\nthree")
        self.assertEqual(t("sed -n '0~2p' a.txt"), "two\nfour")
        self.assertEqual(t("sed 'y/abc/xyz/' b.txt | head -n 1"), "xlphx yetx")
        self.assertEqual(t("sed -e 's/one/1/' -e 's/two/2/' a.txt | head -n 2"), "1\n2")
        self.assertEqual(t("sed ':a;N;$!ba;s/\\n/,/g' a.txt"), "one,two,three,four")
        self.assertEqual(t("sed '2q' a.txt"), "one\ntwo")
        self.assertEqual(t("sed -n 'h;n;G;p' a.txt"), "two\none\nfour\nthree")

    def test_sed_in_place_backup_and_symlinks(self):
        t = self.t
        t("sudo sed -i.bak 's/^Port 22$/Port 2222/' /etc/app/main.conf")
        self.assertEqual(t("grep ^Port /etc/app/main.conf"), "Port 2222")
        self.assertEqual(t("grep ^Port /etc/app/main.conf.bak"), "Port 22")
        # GNU sed -i заменяет символическую ссылку обычным файлом...
        t("sudo sed -i 's/demo/via-link/' /etc/app/link.conf")
        self.assertEqual(t("find /etc/app -name link.conf -type l"), "")
        self.assertEqual(t("grep -c via-link /etc/app/main.conf"), "0")
        # ...а с --follow-symlinks меняет оригинал.
        os.remove(Path(self.root, "etc/app/link.conf"))
        os.symlink("main.conf", Path(self.root, "etc/app/link.conf"))
        t("sudo sed -i --follow-symlinks 's/demo/followed/' /etc/app/link.conf")
        self.assertEqual(t("grep Name /etc/app/main.conf"), "Name followed")
        self.assertEqual(t("find /etc/app -name link.conf -type l"), "/etc/app/link.conf")

    def test_sed_errors(self):
        t = self.t
        self.assertIn("незавершённая команда «s»", t("sed 's/a/b' a.txt"))
        self.assertIn("неизвестная команда", t("sed 'k' a.txt"))
        self.assertIn("запрещена", t("sed 'e ls' a.txt"))
        self.assertIn("не удаётся прочитать", t("sed p nope.txt"))

    def test_caesar_sandbox_is_read_only_home(self):
        with tempfile.TemporaryDirectory() as d:
            make_tree(d, {"TASK.md": "hello\n"})
            sb = Sandbox(d, "st", "", mapped_home=True, writable=False)
            session = {"student_id": "st", "cwd": "", "sandbox": sb}
            ctx = shell.Ctx(session, sb)
            self.assertEqual(shell.run(ctx, "pwd"), "/home/st")
            ctx = shell.Ctx(session, sb)
            self.assertIn("только для чтения", shell.run(ctx, "sed -i s/h/H/ TASK.md"))
            ctx = shell.Ctx(session, sb)
            self.assertIn("за пределы", shell.run(ctx, "cat ../../etc/passwd"))


class ConfigTaskTests(unittest.TestCase):
    """Генератор задания №4 + эталонное решение через эмулятор + чекер."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name, "st-1")
        self.params = config_task.make_params(random.Random(7))
        generate_configs.build(self.root, "st-1", self.params, random.Random(7))
        self.params["decoys"] = {p: config_task.file_hash(self.root / p) for p in config_task.decoy_paths("st-1")}
        self.t = Term(self.root, "st-1")

    def tearDown(self):
        for p in self.root.rglob("*"):
            if p.is_dir() and not p.is_symlink():
                os.chmod(p, 0o755)
        self.tmp.cleanup()

    def stages(self):
        return {s["stage"]: s["status"] for s in config_task.check(self.root, self.params, "st-1")}

    def test_fresh_server_fails_every_required_check(self):
        stages = config_task.check(self.root, self.params, "st-1")
        self.assertEqual(config_task.summary(stages), (0, 8, False))
        self.assertEqual(stages[-1]["status"], "pass")

    def test_reference_solution_passes(self):
        p = self.params
        t = self.t
        for line in [
            f"sudo sed -i 's/^#Port 22$/Port {p['ssh_port']}/' /etc/ssh/sshd_config",
            "sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config",
            "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config.d/50-cloud-init.conf",
            f"sudo sed -i 's/^Listen 80$/Listen {p['apache_port']}/' /etc/apache2/ports.conf",
            f"sudo sed -i 's/<VirtualHost \\*:80>/<VirtualHost *:{p['apache_port']}>/' /etc/apache2/sites-available/000-default.conf",
            "sudo sed -i -e 's/^ServerTokens OS/ServerTokens Prod/' -e 's/^ServerSignature On/ServerSignature Off/' /etc/apache2/conf-available/security.conf",
            "sudo sed -i -E 's/^(bind-address\\s*=\\s*).*/\\1127.0.0.1/' /etc/mysql/mariadb.conf.d/50-server.cnf",
            f"sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = {p['upload_max']}/' /etc/php/8.2/apache2/php.ini",
        ]:
            self.assertEqual(t(line), "", line)
        self.assertEqual(set(self.stages().values()), {"pass"})

    def test_traps(self):
        t = self.t
        # Пароль в sshd_config не спасает: первое значение даёт sshd_config.d
        t("sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config")
        self.assertEqual(self.stages()[3], "fail")
        # Конфиг клиента и php.ini для CLI — не те файлы, и это видно в необязательном пункте
        t("sudo sed -i 's/^upload_max_filesize = .*/upload_max_filesize = 1G/' /etc/php/8.2/cli/php.ini")
        self.assertEqual(self.stages()[8], "fail")
        self.assertEqual(self.stages()[9], "fail")
        # Порт 443 внутри <IfModule> не считается
        t(f"sudo sed -i 's/^Listen 80$/Listen {self.params['apache_port']}/' /etc/apache2/ports.conf")
        self.assertEqual(self.stages()[4], "pass")

    def test_progress_is_saved(self):
        conn = sqlite3.connect(":memory:")
        conn.execute("CREATE TABLE users (id TEXT PRIMARY KEY)")
        config_task.ensure_table(conn)
        config_task.insert_row(conn, "st-1", self.params)
        stages = config_task.check(self.root, self.params, "st-1")
        self.assertFalse(config_task.save_progress(conn, "st-1", stages))
        row = conn.execute("SELECT passed, total, solved FROM ib_config_tasks").fetchone()
        self.assertEqual(row, (0, 8, 0))
        self.assertEqual(json.loads(conn.execute("SELECT params FROM ib_config_tasks").fetchone()[0])["ssh_port"],
                         self.params["ssh_port"])


if __name__ == "__main__":
    unittest.main()
