#!/usr/bin/env python3
"""
№6. Генератор задания «Расследование инцидента по журналам».

Для каждого студента — свой учебный сервер в data/ctf/incident/<id>/ и свой инцидент:
  - /var/log/auth.log за двое суток: обычные входы администраторов, CRON, sudo, одна опечатка admin
    в пароле, ночной перебор несуществующих имён со «сканера» и подбор пароля к СУЩЕСТВУЮЩЕЙ учётной
    записи с другого адреса, закончившийся успешным входом и chmod внутреннего отчёта через sudo;
  - /var/log/wtmp и /var/log/btmp (для last и lastb), /etc/passwd, /etc/group (учётная запись
    атакованного сотрудника по ошибке состоит в группе sudo), /etc/shadow, /etc/sudoers.d;
  - /srv/company/reports/ — отчёт, которому злоумышленник открыл права;
  - ~/incident/report-template.txt и ~/TASK.md.
Значения и выводы из них (SHA-256 журнала, строки временной шкалы, число попыток) — в
ib_lab_tasks.params. Проверка — server/incident_task.py.

Использование:
    ./generate_incident.py --group IB
    ./generate_incident.py --student st-test-001
    ./generate_incident.py --group IB --force          # выдать заново (новый инцидент, прогресс обнуляется)
    ./generate_incident.py --group IB --refresh-task   # только переписать ~/TASK.md
"""

import hashlib
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import lab_gen  # noqa: E402
from lab_gen import Tree, base_system, fake_hash  # noqa: E402
import incident_task  # noqa: E402

LAB = incident_task.LAB

TARGETS = ["webops", "jsmith", "akim", "dbadmin", "devops", "mlee", "operator1", "rnazarov", "tkarimova", "fmirzo"]
FILES = ["internal-report.txt", "salary-2026.csv", "clients-q3.xlsx", "audit-plan.docx", "contracts-list.csv"]
BAD_MODES = ["666", "664", "646"]
SCAN_USERS = ["admin1", "test", "oracle", "postgres", "ubuntu", "guest", "user", "ftp", "support", "pi", "git",
              "deploy", "minecraft", "nagios", "teamspeak"]

DAY1 = time.mktime(time.strptime("2026-10-10 00:00:00", "%Y-%m-%d %H:%M:%S"))


def make_params(rng, student_id):
    return {
        "target": rng.choice(TARGETS),
        "file_name": rng.choice(FILES),
        "bad_mode": rng.choice(BAD_MODES),
        "attacker_ip": f"203.0.113.{rng.randint(11, 249)}",
        "scanner_ip": f"198.51.100.{rng.randint(11, 249)}",
        "attack_failed": rng.randint(6, 11),
        "scan_count": rng.randint(11, 15),
    }


class Log:
    def __init__(self, rng):
        self.rng = rng
        self.lines = []      # (время, текст)
        self.pid = 900

    def add(self, ts, proc, text, pid=None):
        if pid is None:
            self.pid += self.rng.randint(1, 40)
            pid = self.pid
        self.lines.append((ts, f"{proc}[{pid}]: {text}" if proc != "sudo" else f"sudo: {text}"))
        return pid

    def text(self):
        self.lines.sort(key=lambda x: x[0])
        out = []
        for ts, text in self.lines:
            out.append(f"{time.strftime('%b %d %H:%M:%S', time.localtime(ts))} seclab {text}")
        return out


def session(log, wtmp, ts, user, uid, ip, method, minutes, sudo_cmds=(), tty="pts/0"):
    rng = log.rng
    port = rng.randint(40000, 65000)
    pid = log.add(ts, "sshd", f"Accepted {method} for {user} from {ip} port {port} ssh2"
                  + (": ED25519 SHA256:" + hashlib.sha256(user.encode()).hexdigest()[:43] if method == "publickey" else ""))
    log.add(ts, "sshd", f"pam_unix(sshd:session): session opened for user {user}(uid={uid}) by (uid=0)", pid)
    log.add(ts + 1, "systemd-logind", f"New session {rng.randint(10, 99)} of user {user}.", 512)
    t = ts + 30
    for cmd in sudo_cmds:
        t += rng.randint(20, 240)
        log.add(t, "sudo", f"  {user} : TTY={tty} ; PWD=/home/{user} ; USER=root ; COMMAND={cmd}")
        log.add(t, "sudo", f"pam_unix(sudo:session): session opened for user root(uid=0) by {user}(uid={uid})")
        log.add(t + 1, "sudo", "pam_unix(sudo:session): session closed for user root")
    end = max(ts + minutes * 60, t + 60)
    log.add(end, "sshd", f"Received disconnect from {ip} port {port}:11: disconnected by user", pid)
    log.add(end, "sshd", f"Disconnected from user {user} {ip} port {port}", pid)
    log.add(end, "sshd", f"pam_unix(sshd:session): session closed for user {user}", pid)
    wtmp.append({"user": user, "tty": tty, "host": ip, "login": ts, "logout": end})
    return end


def build(root, student_id, params, rng):
    t = Tree(root)
    home = base_system(t, student_id)
    target = params["target"]
    attacker, scanner = params["attacker_ip"], params["scanner_ip"]
    report_path = f"/srv/company/reports/{params['file_name']}"

    users = [("admin", 1001, "Администратор сервера"), (target, 1002, "Сотрудник веб-отдела"),
             (student_id, 1000, "Специалист по реагированию")]
    passwd = ["root:x:0:0:root:/root:/bin/bash", "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
              "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
              "backup:x:34:34:backup:/var/backups:/usr/sbin/nologin",
              "sshd:x:110:65534::/run/sshd:/usr/sbin/nologin"]
    shadow = ["root:!:19600:0:99999:7:::", "daemon:*:19600:0:99999:7:::", "www-data:*:19600:0:99999:7:::",
              "backup:*:19600:0:99999:7:::", "sshd:*:19600:0:99999:7:::"]
    groups = ["root:x:0:", "adm:x:4:admin", f"sudo:x:27:admin,{target},{student_id}", "www-data:x:33:",
              "backup:x:34:", f"web-maintainers:x:1500:{target}"]
    for name, uid, gecos in users:
        passwd.append(f"{name}:x:{uid}:{uid}:{gecos},,,:/home/{name}:/bin/bash")
        shadow.append(f"{name}:{fake_hash(rng)}:19800:0:99999:7:::")
        groups.append(f"{name}:x:{uid}:")
    t.f("etc/passwd", "\n".join(passwd) + "\n")
    t.f("etc/shadow", "\n".join(shadow) + "\n", 0o640)
    t.f("etc/group", "\n".join(groups) + "\n")
    t.f("etc/sudoers.d/web-maintainers",
        "# Сотрудникам веб-отдела разрешено только перезагружать веб-сервер\n"
        "%web-maintainers ALL=(root) /usr/bin/systemctl reload apache2\n", 0o440)
    for name in ("admin", target):
        t.d(f"home/{name}", 0o750)
        t.f(f"home/{name}/.bashrc", lab_gen.BASHRC)

    # --- данные компании ---
    t.d("srv/company", 0o755)
    t.d("srv/company/reports", 0o755)
    for name in sorted(set(FILES) | {params["file_name"]}):
        mode = int(params["bad_mode"], 8) if name == params["file_name"] else 0o640
        t.f(f"srv/company/reports/{name}", f"Внутренний документ компании: {name}\nКонфиденциально.\n", mode,
            mtime=DAY1 - 86400 * 3)
    t.f("srv/company/README", "Каталог данных компании. Отчёты — только для группы reports (права 640).\n")

    # --- журналы ---
    log, wtmp, btmp = Log(rng), [], []
    log.add(DAY1 + 6 * 3600 + 25 * 60 + 1, "rsyslogd", "[origin software=\"rsyslogd\"] rsyslogd was HUPed", 611)
    for day in (0, 1):
        for hour in range(7 if day == 0 else 0, 24 if day == 0 else 10):
            ts = DAY1 + day * 86400 + hour * 3600 + 17 * 60 + 1
            pid = log.add(ts, "CRON", "pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)")
            log.add(ts, "CRON", "pam_unix(cron:session): session closed for user root", pid)

    # день 1: обычная работа
    session(log, wtmp, DAY1 + 9 * 3600 + rng.randint(0, 900), "admin", 1001, "10.0.5.12", "publickey", 40,
            ["/usr/bin/apt update", "/usr/bin/apt upgrade -y"])
    session(log, wtmp, DAY1 + 11 * 3600 + rng.randint(0, 900), target, 1002, "10.0.5.31", "password", 25,
            ["/usr/bin/systemctl reload apache2"])
    typo = DAY1 + 14 * 3600 + rng.randint(0, 900)
    log.add(typo, "sshd", f"Failed password for admin from 10.0.5.12 port {rng.randint(40000, 65000)} ssh2")
    btmp.append({"user": "admin", "tty": "ssh:notty", "host": "10.0.5.12", "login": typo, "logout": typo})
    session(log, wtmp, typo + 6, "admin", 1001, "10.0.5.12", "password", 15, ["/usr/bin/journalctl -p err"])

    # ночь: сканер перебирает несуществующие имена
    ts = DAY1 + 22 * 3600 + rng.randint(0, 1200)
    for name in rng.sample(SCAN_USERS, params["scan_count"]):
        ts += rng.randint(3, 50)
        port = rng.randint(30000, 65000)
        pid = log.add(ts, "sshd", f"Invalid user {name} from {scanner} port {port}")
        log.add(ts + 1, "sshd", f"Failed password for invalid user {name} from {scanner} port {port} ssh2", pid)
        log.add(ts + 2, "sshd", f"Connection closed by invalid user {name} {scanner} port {port} [preauth]", pid)
        btmp.append({"user": name, "tty": "ssh:notty", "host": scanner, "login": ts + 1, "logout": ts + 1})

    # день 2, ночь: подбор пароля к существующей учётной записи и вход
    ts = DAY1 + 86400 + 2 * 3600 + rng.randint(20, 40) * 60 + rng.randint(0, 59)
    for _ in range(params["attack_failed"]):
        ts += rng.randint(2, 9)
        log.add(ts, "sshd", f"Failed password for {target} from {attacker} port {rng.randint(30000, 65000)} ssh2")
        btmp.append({"user": target, "tty": "ssh:notty", "host": attacker, "login": ts, "logout": ts})
    login = ts + rng.randint(3, 12)
    session(log, wtmp, login, target, 1002, attacker, "password", rng.randint(9, 25),
            ["/usr/bin/ls -l /srv/company/reports", f"/usr/bin/chmod {params['bad_mode']} {report_path}"])

    # утро: обычный вход администратора
    session(log, wtmp, DAY1 + 86400 + 8 * 3600 + rng.randint(0, 1200), "admin", 1001, "10.0.5.12", "publickey", 20)

    lines = log.text()
    last_ts = log.lines[-1][0]
    auth_text = "\n".join(lines) + "\n"
    t.f("var/log/auth.log", auth_text, 0o640, mtime=last_ts)
    t.f("var/log/syslog", "\n".join(
        f"{time.strftime('%b %d %H:%M:%S', time.localtime(DAY1 + 86400 + h * 3600 + 5))} seclab systemd[1]: "
        "Starting apt-daily.service - Daily apt download activities..." for h in range(0, 9)) + "\n", 0o640)
    t.f("var/log/wtmp", "\n".join(json.dumps(r) for r in wtmp) + "\n", 0o664, mtime=last_ts)
    t.f("var/log/btmp", "\n".join(json.dumps(r) for r in btmp) + "\n", 0o600, mtime=last_ts)

    # --- рабочие файлы студента ---
    t.d(f"{home}/incident")
    t.f(f"{home}/incident/report-template.txt",
        "Отчёт об инциденте\nУчётная запись:\nIP-адрес:\nНеудачных попыток:\nВремя входа:\n"
        "Изменённый файл:\nМеры:\n")
    t.finish()

    timeline = [x for x in lines if attacker in x]
    sudo_lines = [x for x in lines if re.search(rf"sudo:\s+{re.escape(target)} :", x)]
    params.update({
        "file": report_path,
        "auth_sha256": hashlib.sha256(auth_text.encode()).hexdigest(),
        "auth_lines": len(lines),
        "last_time": re.search(r"\d\d:\d\d:\d\d", lines[-1]).group(0),
        "failed_total": sum("Failed password" in x for x in lines),
        "login_time": time.strftime("%H:%M:%S", time.localtime(login)),
        "admin_failed": sum(re.search(r"Failed password for admin ", x) is not None for x in lines),
        "timeline": timeline,
        "sudo_lines": sudo_lines,
    })
    return params


if __name__ == "__main__":
    lab_gen.main(LAB, make_params, build, "Задание №6: расследование инцидента по журналам",
                 keep_keys=("target", "attacker_ip", "file_name", "bad_mode", "attack_failed"))
