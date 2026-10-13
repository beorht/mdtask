#!/usr/bin/env python3
"""
№4. Генератор задания «Поиск и правка конфигурационных файлов».

Для каждого студента:
  1. Выбирает личные целевые значения (порт SSH, порт Apache, upload_max_filesize)
     — config_task.make_params();
  2. Строит в data/ctf/configs/<student_id>/ файловую систему учебного сервера Debian 12:
     /etc (ssh, apache2, mysql, php, ...), /var (логи, резервные копии, www), /usr,
     /root, /tmp и /home/<id> с условием задания TASK.md;
     права и даты изменения файлов — как на настоящем сервере (их видят ls -l и find -perm/-mtime);
  3. Считает эталонные хеши файлов-обманок (их менять нельзя) и записывает всё
     в таблицу ib_config_tasks базы mdtask.

Использование:
    ./generate_configs.py --group IB
    ./generate_configs.py --student st-test-001
    ./generate_configs.py --group IB --force     # выдать заново: новые значения, песочница с нуля
    ./generate_configs.py --group IB --refresh-task  # только обновить ~/TASK.md (после правки TASK.md)

По умолчанию студенты, у которых запись уже есть, пропускаются (их песочница не трогается);
если запись есть, а песочницы на диске нет, — песочница восстанавливается с прежними значениями.
"""

import argparse
import json
import os
import random
import shutil
import sqlite3
import string
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
IB_DIR = HERE.parents[1]
REPO_ROOT = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(HERE))
import config_task  # noqa: E402
import templates as T  # noqa: E402

TASK_MD_SOURCE = HERE / "TASK.md"
TEACHER_HEADING = "## Для преподавателя"


def ts(date, hm="10:00"):
    return time.mktime(time.strptime(f"{date} {hm}", "%Y-%m-%d %H:%M"))


INSTALL = ts("2025-03-12", "09:41")


class Tree:
    """Создаёт файлы, каталоги и ссылки; режимы и даты выставляются в finish()."""

    def __init__(self, root):
        self.root = root
        self.modes = {}
        self.mtimes = {}

    def d(self, rel, mode=0o755, mtime=None):
        (self.root / rel).mkdir(parents=True, exist_ok=True)
        self.modes[rel] = mode
        if mtime:
            self.mtimes[rel] = mtime

    def f(self, rel, content, mode=0o644, mtime=None):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            path.write_bytes(content)
        else:
            path.write_text(content, encoding="utf-8")
        self.modes[rel] = mode
        self.mtimes[rel] = mtime or INSTALL

    def link(self, rel, target, mtime=None):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.is_symlink() or path.exists():
            path.unlink()
        os.symlink(target, path)
        self.mtimes[rel] = mtime or INSTALL

    def finish(self):
        # Сначала файлы, потом каталоги снизу вверх — иначе запись в каталог сбросит его дату.
        for rel, mtime in self.mtimes.items():
            p = self.root / rel
            if p.is_symlink():
                os.utime(p, (mtime, mtime), follow_symlinks=False)
            elif p.is_file():
                os.utime(p, (mtime, mtime))
        for rel, mode in self.modes.items():
            p = self.root / rel
            if not p.is_symlink():
                os.chmod(p, mode)
        dirs = sorted({p for p in self.root.rglob("*") if p.is_dir() and not p.is_symlink()},
                      key=lambda p: -len(p.parts))
        for p in dirs + [self.root]:
            rel = str(p.relative_to(self.root)) if p != self.root else ""
            mtime = self.mtimes.get(rel, INSTALL)
            os.utime(p, (mtime, mtime))
        os.chmod(self.root, 0o755)


def student_task_md(params):
    text = TASK_MD_SOURCE.read_text(encoding="utf-8")
    if TEACHER_HEADING in text:
        text = text[:text.index(TEACHER_HEADING)].rstrip().rstrip("-").rstrip() + "\n"
    for key in ("ssh_port", "apache_port", "upload_max"):
        text = text.replace("{" + key + "}", str(params[key]))
    return text


def build(root, student_id, params, rng):
    t = Tree(root)
    home = f"home/{student_id}"
    now = time.time()
    day = 86400
    secret = "".join(rng.choice(string.ascii_letters + string.digits) for _ in range(16))
    log_date = time.strftime("%b %d %H:%M:%S", time.localtime(now - 3600))
    web_date = time.strftime("%d/%b/%Y:%H:%M:%S +0500", time.localtime(now - 7200))
    err_date = time.strftime("%a %b %d %H:%M:%S.000000 %Y", time.localtime(now - 7200))

    # --- корень ---
    for rel in ("etc", "var", "usr", "opt", "srv", "mnt", "media", "boot"):
        t.d(rel)
    t.d("tmp", 0o1777, now - 600)
    t.d("root", 0o700)

    # --- /etc: система ---
    t.f("etc/hostname", "seclab\n")
    t.f("etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tseclab\n\n::1\tlocalhost ip6-localhost ip6-loopback\n")
    t.f("etc/timezone", "Asia/Tashkent\n")
    t.f("etc/os-release", T.OS_RELEASE)
    t.f("etc/fstab", T.FSTAB)
    t.f("etc/crontab", T.CRONTAB)
    t.f("etc/sysctl.conf", T.SYSCTL)
    t.f("etc/environment", "")
    t.f("etc/resolv.conf", "nameserver 10.0.2.3\nsearch local\n")
    t.f("etc/security/limits.conf", T.LIMITS_CONF)
    t.f("etc/passwd", (
        "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n"
        "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nsshd:x:100:65534::/run/sshd:/usr/sbin/nologin\n"
        "mysql:x:101:102:MariaDB Server,,,:/nonexistent:/bin/false\n"
        f"{student_id}:x:1000:1000:{student_id},,,:/home/{student_id}:/bin/bash\n"))
    t.f("etc/group", f"root:x:0:\nadm:x:4:\nsudo:x:27:{student_id}\nwww-data:x:33:\nmysql:x:102:\n{student_id}:x:1000:\n")
    t.f("etc/shadow", f"root:$y$j9T${secret}:20160:0:99999:7:::\n{student_id}:$y$j9T${secret[::-1]}:20160:0:99999:7:::\n",
        0o640)
    t.f("etc/sudoers", "Defaults\tenv_reset\nroot\tALL=(ALL:ALL) ALL\n%sudo\tALL=(ALL:ALL) ALL\n", 0o440)
    t.f("etc/default/ssh", T.SSH_DEFAULT)
    t.f("etc/cron.d/php", T.CRON_PHP)
    t.f("etc/logrotate.d/apache2", T.LOGROTATE_APACHE)
    t.f("etc/logrotate.d/mariadb", T.LOGROTATE_MARIADB)

    # --- /etc/ssh ---
    t.f("etc/ssh/sshd_config", T.SSHD_CONFIG, mtime=ts("2025-11-02", "18:23"))
    t.f("etc/ssh/ssh_config", T.SSH_CONFIG)
    t.f("etc/ssh/sshd_config.d/50-cloud-init.conf", T.SSHD_CLOUD_INIT, mtime=ts("2025-03-12", "09:44"))
    t.d("etc/ssh/ssh_config.d")
    t.f("etc/ssh/moduli", "# Time Type Tests Tries Size Generator Modulus\n20230123020712 2 6 100 3071 2 F1F0...\n")
    for kind in ("rsa", "ecdsa", "ed25519"):
        t.f(f"etc/ssh/ssh_host_{kind}_key", f"-----BEGIN OPENSSH PRIVATE KEY-----\n{secret * 3}\n-----END OPENSSH PRIVATE KEY-----\n", 0o600)
        t.f(f"etc/ssh/ssh_host_{kind}_key.pub", f"ssh-{kind} AAAA{secret} root@seclab\n")

    # --- /etc/apache2 ---
    t.f("etc/apache2/apache2.conf", T.APACHE2_CONF)
    t.f("etc/apache2/ports.conf", T.PORTS_CONF)
    t.f("etc/apache2/envvars", T.ENVVARS)
    t.f("etc/apache2/magic", "# Magic data for mod_mime_magic\n0\tstring\t%PDF-\tapplication/pdf\n")
    t.f("etc/apache2/sites-available/000-default.conf", T.DEFAULT_SITE)
    t.f("etc/apache2/sites-available/default-ssl.conf", T.DEFAULT_SSL_SITE)
    t.link("etc/apache2/sites-enabled/000-default.conf", "../sites-available/000-default.conf")
    confs = {"charset.conf": T.CHARSET_CONF, "security.conf": T.SECURITY_CONF,
             "other-vhosts-access-log.conf": T.OTHER_VHOSTS_LOG, "serve-cgi-bin.conf": T.SERVE_CGI,
             "localized-error-pages.conf": "# Customizable error responses\n#ErrorDocument 404 /missing.html\n"}
    for name, content in confs.items():
        t.f(f"etc/apache2/conf-available/{name}", content,
            mtime=ts("2025-06-10", "14:05") if name == "security.conf" else None)
        if name != "localized-error-pages.conf":
            t.link(f"etc/apache2/conf-enabled/{name}", f"../conf-available/{name}")
    for name, content in T.MODS.items():
        t.f(f"etc/apache2/mods-available/{name}", content)
    for name in T.MODS_ENABLED:
        t.link(f"etc/apache2/mods-enabled/{name}", f"../mods-available/{name}")

    # --- /etc/mysql ---
    t.f("etc/mysql/mariadb.cnf", T.MY_CNF)
    t.link("etc/mysql/my.cnf", "mariadb.cnf")
    t.f("etc/mysql/my.cnf.fallback", T.MY_CNF_FALLBACK)
    t.f("etc/mysql/debian.cnf", T.DEBIAN_CNF.replace("{db_password}", secret[:12]), 0o600)
    t.f("etc/mysql/debian-start", "#!/bin/bash\n# This script is executed by \"/etc/init.d/mariadb\" on every (re)start.\n", 0o755)
    for name, content in T.MYSQL_CONF_D.items():
        t.f(f"etc/mysql/conf.d/{name}", content)
    t.f("etc/mysql/mariadb.conf.d/50-client.cnf", T.MARIADB_CLIENT)
    t.f("etc/mysql/mariadb.conf.d/50-mysql-clients.cnf", T.MARIADB_CLIENTS)
    t.f("etc/mysql/mariadb.conf.d/50-mysqld_safe.cnf", T.MARIADB_SAFE)
    t.f("etc/mysql/mariadb.conf.d/50-server.cnf", T.MARIADB_SERVER, mtime=ts("2025-09-18", "11:30"))
    t.f("etc/mysql/mariadb.conf.d/60-galera.cnf", T.MARIADB_GALERA)

    # --- /etc/php ---
    t.f("etc/php/8.2/apache2/php.ini", T.php_ini("apache2"), mtime=ts("2025-10-05", "16:12"))
    t.f("etc/php/8.2/cli/php.ini", T.php_ini("cli"))
    for name, content in T.PHP_MODS.items():
        t.f(f"etc/php/8.2/mods-available/{name}", content)
    for sapi in ("apache2", "cli"):
        for link, target in T.PHP_CONF_D.items():
            t.link(f"etc/php/8.2/{sapi}/conf.d/{link}", f"../../mods-available/{target}")

    # --- /etc/ssl, systemd ---
    t.f("etc/ssl/certs/ssl-cert-snakeoil.pem", f"-----BEGIN CERTIFICATE-----\n{secret * 4}\n-----END CERTIFICATE-----\n")
    t.f("etc/ssl/private/ssl-cert-snakeoil.key", f"-----BEGIN PRIVATE KEY-----\n{secret * 4}\n-----END PRIVATE KEY-----\n", 0o640)
    t.d("etc/ssl/private", 0o710)
    for unit, content in T.SYSTEMD_UNITS.items():
        t.f(f"usr/lib/systemd/system/{unit}", content)
        t.link(f"etc/systemd/system/multi-user.target.wants/{unit}", f"../../../../usr/lib/systemd/system/{unit}")

    # --- /usr ---
    for name in ("bash", "ls", "cat", "find", "grep", "sed", "head", "tail", "wc", "sort", "uniq", "cut",
                 "xargs", "tee", "cp", "touch", "diff", "stat", "id", "whoami", "date", "man", "which",
                 "sqlite3", "systemctl", "apt", "curl", "nano", "vim.basic"):
        t.f(f"usr/bin/{name}", "", 0o755)
    for name in ("sudo", "passwd", "su", "mount"):
        t.f(f"usr/bin/{name}", "", 0o4755)
    for name in ("sshd", "apache2", "apachectl", "mariadbd", "a2ensite", "a2dissite", "a2enconf", "a2enmod"):
        t.f(f"usr/sbin/{name}", "", 0o755)
    t.f("usr/share/openssh/sshd_config", T.SSHD_TEMPLATE)
    t.f("usr/lib/php/8.2/php.ini-production", T.php_ini("apache2"))
    t.f("usr/lib/php/8.2/php.ini-development", T.php_ini("apache2").replace("display_errors = Off", "display_errors = On"))
    t.f("usr/share/doc/apache2/README.Debian", T.APACHE_README)
    t.f("usr/share/doc/apache2/examples/ports.conf", T.PORTS_EXAMPLE)

    # --- /var ---
    t.f("var/www/html/index.html", T.INDEX_HTML)
    t.f("var/www/html/info.php", T.INFO_PHP, mtime=ts("2025-10-05", "16:20"))
    t.f("var/log/apache2/access.log", T.ACCESS_LOG.replace("{d}", web_date), 0o640, mtime=now - 1800)
    t.f("var/log/apache2/error.log", T.ERROR_LOG.replace("{d}", err_date), 0o640, mtime=now - 7200)
    t.f("var/log/apache2/other_vhosts_access.log", "", 0o640, mtime=now - 5 * day)
    t.d("var/log/apache2", 0o750)
    t.f("var/log/auth.log", T.AUTH_LOG.replace("{d}", log_date).replace("{user}", student_id), 0o640, mtime=now - 3600)
    t.f("var/log/syslog", f"{log_date} seclab systemd[1]: Started ssh.service - OpenBSD Secure Shell server.\n", 0o640,
        mtime=now - 3600)
    t.d("var/log/mysql", 0o750)
    t.f("var/backups/sshd_config.bak", T.SSHD_BACKUP, mtime=ts("2025-11-01", "21:02"))
    t.f("var/backups/ports.conf.bak", T.PORTS_CONF, mtime=ts("2025-11-01", "21:03"))
    t.f("var/backups/apache2.conf.bak", T.APACHE2_CONF, mtime=ts("2025-11-01", "21:03"))
    t.f("var/lib/mysql/ibdata1", b"\0" * 2048 + secret.encode(), 0o660)
    t.f("var/lib/mysql/aria_log_control", b"\xfe\xfe\x0c\x01" + b"\0" * 48, 0o660)
    t.d("var/lib/mysql", 0o700)
    t.d("var/lib/php/sessions", 0o1733)

    # --- /root ---
    t.f("root/.bashrc", T.BASHRC, 0o644)
    t.f("root/.bash_history", "nano /etc/ssh/sshd_config\nsystemctl restart ssh\nmysql -u root\n", 0o600)

    # --- /home/<id> ---
    t.d(home, 0o755, now - day)
    t.f(f"{home}/.bashrc", T.BASHRC)
    t.f(f"{home}/.profile", T.PROFILE)
    t.f(f"{home}/.bash_logout", "# ~/.bash_logout: executed by bash(1) when login shell exits.\n")
    t.f(f"{home}/.bash_history", T.BASH_HISTORY, 0o600, mtime=now - day)
    t.f(f"{home}/TASK.md", student_task_md(params), mtime=now - day)
    t.f(f"{home}/notes.txt", T.NOTES, mtime=ts("2025-11-02", "18:40"))
    t.f(f"{home}/backup/sshd_config.old", T.SSHD_BACKUP, mtime=ts("2025-11-02", "18:01"))
    t.f(f"{home}/backup/ports.conf.old", T.PORTS_CONF, mtime=ts("2025-11-02", "18:02"))
    t.finish()


def ensure_users(conn, group, student):
    if student:
        row = conn.execute("SELECT id FROM users WHERE id=? AND role='student'", (student,)).fetchone()
        if not row:
            sys.exit(f"Студент {student} не найден")
        return [student]
    rows = conn.execute("SELECT id FROM users WHERE role='student' AND student_group=? ORDER BY id", (group,)).fetchall()
    if not rows:
        sys.exit(f"В группе {group} нет студентов")
    return [r[0] for r in rows]


def main():
    ap = argparse.ArgumentParser(description="Задание №4: поиск и правка конфигурационных файлов")
    who = ap.add_mutually_exclusive_group(required=True)
    who.add_argument("--group", help="student_group (например IB)")
    who.add_argument("--student", help="один студент (например st-test-001)")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--out", default=str(REPO_ROOT / "data" / "ctf" / "configs"))
    ap.add_argument("--force", action="store_true", help="выдать заново: новые значения, песочница с нуля")
    ap.add_argument("--refresh-task", action="store_true",
                    help="только переписать ~/TASK.md у тех, кому задание уже выдано (значения и прогресс сохраняются)")
    args = ap.parse_args()
    if args.force and args.refresh_task:
        sys.exit("--force и --refresh-task несовместимы")

    out_root = Path(args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    config_task.ensure_table(conn)
    students = ensure_users(conn, args.group, args.student)

    created = restored = skipped = 0
    for student_id in students:
        rng = random.Random()
        root = (out_root / student_id).resolve()
        if root.parent != out_root:
            sys.exit(f"Подозрительный путь песочницы: {root}")
        row = config_task.load_row(conn, student_id)
        if args.refresh_task:
            if not (row and root.exists()):
                skipped += 1
                continue
            task_md = root / "home" / student_id / "TASK.md"
            task_md.parent.mkdir(parents=True, exist_ok=True)
            task_md.write_text(student_task_md(json.loads(row["params"])), encoding="utf-8")
            os.chmod(task_md, 0o644)
            restored += 1
            print(f"  {student_id}: TASK.md обновлён")
            continue
        if row and not args.force and root.exists():
            skipped += 1
            continue
        if row and not args.force:
            params = json.loads(row["params"])
        else:
            params = config_task.make_params(rng)
        if root.exists():
            shutil.rmtree(root)
        build(root, student_id, params, rng)
        params["decoys"] = {p: config_task.file_hash(root / p) for p in config_task.decoy_paths(student_id)}
        if row:
            conn.execute(
                "UPDATE ib_config_tasks SET params=?, passed=0, total=0, solved=0, solved_at=NULL, checked_at=NULL "
                "WHERE student_id=?" if args.force else "UPDATE ib_config_tasks SET params=? WHERE student_id=?",
                (json.dumps(params, ensure_ascii=False), student_id),
            )
            restored += 0 if args.force else 1
            created += 1 if args.force else 0
        else:
            config_task.insert_row(conn, student_id, params)
            created += 1
        conn.commit()
        print(f"  {student_id}: SSH {params['ssh_port']}, Apache {params['apache_port']}, upload {params['upload_max']}")
    conn.close()
    if args.refresh_task:
        print(f"Готово: TASK.md обновлён у {restored}, пропущено (задание не выдано) {skipped}.")
        return
    print(f"Готово: выдано {created}, восстановлено {restored}, пропущено (уже есть) {skipped}. Песочницы: {out_root}")


if __name__ == "__main__":
    main()
