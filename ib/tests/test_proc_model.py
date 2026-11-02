"""
Модель процессов и сокетов (server/proc_model.py) и команды ps/ss (server/cmd_proc.py):
чистые функции форматирования и сквозной прогон через шелл на временной песочнице.
Только временные каталоги — реальные данные не трогаются.
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

IB_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(IB_DIR / "server"))

import proc_model  # noqa: E402
import shell  # noqa: E402
from vfs import Sandbox  # noqa: E402

PROCS = [
    {"pid": 1, "ppid": 0, "user": "root", "cpu": 0.0, "mem": 0.1, "cmd": "/sbin/init",
     "exe": "/sbin/init", "lstart": "Thu Oct 29 09:00:00 2026", "etime": "20:00"},
    {"pid": 1842, "ppid": 1, "user": "root", "cpu": 72.4, "mem": 8.1, "cmd": "/opt/unknown/worker --daemon",
     "exe": "/opt/unknown/worker", "lstart": "Fri Oct 30 03:11:00 2026", "etime": "02:14"},
    {"pid": 1921, "ppid": 1, "user": "www-data", "cpu": 3.2, "mem": 1.4, "cmd": "nginx: worker process",
     "exe": "/usr/sbin/nginx", "lstart": "Thu Oct 29 09:00:05 2026", "etime": "19:59"},
]
SOCKETS = [
    {"proto": "tcp", "state": "LISTEN", "local": "0.0.0.0:22", "peer": "0.0.0.0:*", "pid": 700, "program": "sshd"},
    {"proto": "tcp", "state": "LISTEN", "local": "0.0.0.0:4444", "peer": "0.0.0.0:*", "pid": 1842, "program": "worker"},
    {"proto": "tcp", "state": "ESTAB", "local": "10.0.0.5:51000", "peer": "198.51.100.20:443",
     "pid": 1842, "program": "worker"},
]


class Term:
    def __init__(self, root, user="student"):
        home = f"home/{user}"
        Path(root, home).mkdir(parents=True, exist_ok=True)
        self.sb = Sandbox(root, user, home, mapped_home=False, writable=True)
        self.session = {"student_id": user, "cwd": home, "sandbox": self.sb}

    def __call__(self, line):
        ctx = shell.Ctx(self.session, self.sb)
        return shell.run(ctx, line)


class ProcModelPureTests(unittest.TestCase):
    def test_format_aux_sorts_by_cpu_desc(self):
        out = proc_model.format_aux([proc_model._norm_proc(p) for p in PROCS], sort="-%cpu")
        lines = out.strip().split("\n")
        self.assertEqual(lines[0].split()[:2], ["USER", "PID"])
        # первая строка данных — самый прожорливый процесс
        self.assertIn("1842", lines[1])
        self.assertIn("/opt/unknown/worker", lines[1])

    def test_format_select_fields_and_header_suppression(self):
        procs = [proc_model._norm_proc(p) for p in PROCS]
        out = proc_model.format_select(procs, [1842], ["pid", "ppid", "user", "cmd"])
        lines = out.strip().split("\n")
        self.assertEqual(lines[0].split(), ["PID", "PPID", "USER", "CMD"])
        self.assertEqual(lines[1].split(), ["1842", "1", "root", "/opt/unknown/worker", "--daemon"])
        # поле со знаком = прячет заголовок
        bare = proc_model.format_select(procs, [1842], ["args="])
        self.assertEqual(bare.strip(), "/opt/unknown/worker --daemon")

    def test_format_ss_listening_vs_estab_and_proc(self):
        listen = proc_model.format_ss(SOCKETS, listening=True, protos=("tcp",), show_proc=True)
        self.assertIn("4444", listen)
        self.assertIn('pid=1842', listen)
        self.assertNotIn("ESTAB", listen)
        estab = proc_model.format_ss(SOCKETS, listening=False, protos=("tcp",), show_proc=True)
        self.assertIn("198.51.100.20:443", estab)
        self.assertNotIn("4444", estab)


class ProcCommandTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        proc_model.write_state(self.root, PROCS, SOCKETS)
        proc_model.write_proc_fs(self.root, PROCS)
        # сам бинарь «вредоноса» (чтобы readlink/exe указывал на существующий файл)
        Path(self.root, "opt/unknown").mkdir(parents=True, exist_ok=True)
        Path(self.root, "opt/unknown/worker").write_bytes(b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 56)
        self.t = Term(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def test_ps_aux_and_select(self):
        out = self.t("ps aux --sort=-%cpu")
        self.assertIn("/opt/unknown/worker", out.split("\n")[1])
        sel = self.t("ps -p 1842 -o pid,ppid,user,cmd")
        self.assertIn("PID", sel)
        self.assertIn("1842", sel)
        self.assertIn("/opt/unknown/worker --daemon", sel)
        self.assertEqual(self.t("ps -p 1842 -o cmd=").strip(), "/opt/unknown/worker --daemon")
        self.assertEqual(self.t("ps -p 99999 -o pid=").strip(), "")

    def test_ss(self):
        listen = self.t("ss -lntup")
        self.assertIn(":4444", listen)
        self.assertIn("sshd", listen)
        estab = self.t("ss -tnp")
        self.assertIn("198.51.100.20:443", estab)
        self.assertNotIn(":4444", estab)

    def test_proc_fs(self):
        self.assertIn("1842", self.t("ls /proc"))
        self.assertIn("worker", self.t("readlink /proc/1842/exe"))
        # cmdline разделён NUL — cat склеивает аргументы
        self.assertIn("worker", self.t("cat /proc/1842/cmdline"))


MON_SERVICE = """[Unit]
Description=Seclab monitoring helper

[Service]
ExecStart=/opt/unknown/worker --daemon
Restart=always

[Install]
WantedBy=multi-user.target
"""
MON_TIMER = """[Unit]
Description=Run seclab monitoring every 5 minutes

[Timer]
OnCalendar=*:0/5
Unit=seclab-mon.service

[Install]
WantedBy=timers.target
"""


class SystemdCronTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        d = Path(self.root, "etc/systemd/system")
        d.mkdir(parents=True, exist_ok=True)
        (d / "seclab-mon.service").write_text(MON_SERVICE, encoding="utf-8")
        (d / "seclab-mon.timer").write_text(MON_TIMER, encoding="utf-8")
        (d / "brokensvc.service").write_text("[Unit]\nDescription=Broken\n[Service]\nExecStart=/bin/false\n", encoding="utf-8")
        st = Path(self.root, "var/lib/seclab")
        st.mkdir(parents=True, exist_ok=True)
        (st / "units.json").write_text(json.dumps({"units": {
            "seclab-mon.service": {"active": True, "enabled": True},
            "seclab-mon.timer": {"active": True, "enabled": True},
            "brokensvc.service": {"active": False, "enabled": True, "failed": True},
        }}), encoding="utf-8")
        cron = Path(self.root, "var/spool/cron/crontabs")
        cron.mkdir(parents=True, exist_ok=True)
        (cron / "student").write_text("*/10 * * * * /opt/unknown/worker --sync\n", encoding="utf-8")
        self.t = Term(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def test_list_units_running_and_failed(self):
        running = self.t("systemctl list-units --type=service --state=running")
        self.assertIn("seclab-mon.service", running)
        self.assertIn("running", running)
        self.assertNotIn("brokensvc.service", running)  # не запущена
        failed = self.t("systemctl --failed")
        self.assertIn("brokensvc.service", failed)
        files = self.t("systemctl list-unit-files --type=service")
        self.assertIn("seclab-mon.service", files)
        self.assertIn("enabled", files)

    def test_timers_status_cat(self):
        timers = self.t("systemctl list-timers --all")
        self.assertIn("seclab-mon.timer", timers)
        self.assertIn("seclab-mon.service", timers)  # что запускает
        status = self.t("systemctl status seclab-mon")
        self.assertIn("/opt/unknown/worker", status)  # ExecStart виден
        cat = self.t("systemctl cat seclab-mon")
        self.assertIn("ExecStart=/opt/unknown/worker --daemon", cat)

    def test_crontab(self):
        out = self.t("crontab -l")
        self.assertIn("/opt/unknown/worker --sync", out)
        self.assertIn("*/10", out)


if __name__ == "__main__":
    unittest.main()
