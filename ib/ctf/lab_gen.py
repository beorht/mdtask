"""
Общая часть генераторов пошаговых заданий на движке server/lab_task.py (№6 incident, №7 ssh):
каркас учебного сервера Debian и командная строка (--group / --student, --force, --refresh-task).

Генератор задания задаёт make_params(rng, student_id) и build(root, student_id, params, rng) -> params;
всё остальное — выдача, восстановление песочницы, ~/TASK.md и запись в ib_lab_tasks — здесь.
"""

import argparse
import json
import os
import random
import sqlite3
import sys
from pathlib import Path

CTF_DIR = Path(__file__).resolve().parent
IB_DIR = CTF_DIR.parent
REPO_ROOT = IB_DIR.parent
sys.path.insert(0, str(IB_DIR / "server"))
sys.path.insert(0, str(CTF_DIR / "terminal"))
import lab_task  # noqa: E402
from generate_terminal import BASHRC, INSTALL, Tree, ensure_users, force_rmtree  # noqa: E402,F401

PROFILE = ('# ~/.profile\nif [ -n "$BASH_VERSION" ] && [ -f "$HOME/.bashrc" ]; then\n'
           '    . "$HOME/.bashrc"\nfi\n')


def fake_hash(rng):
    alphabet = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    salt = "".join(rng.choice(alphabet) for _ in range(22))
    body = "".join(rng.choice(alphabet) for _ in range(43))
    return f"$y$j9T${salt}${body}"


def base_system(t, student_id):
    """Каталоги и файлы, общие для всех учебных серверов (без учётных записей)."""
    for d in ("etc", "etc/sudoers.d", "var", "var/log", "var/lib", "usr", "usr/bin", "usr/sbin", "opt", "home",
              "srv", "run"):
        t.d(d)
    t.d("root", 0o700)
    t.d("tmp", 0o1777)
    t.f("etc/hostname", "seclab\n")
    t.f("etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tseclab\n::1\tlocalhost ip6-localhost\n")
    t.f("etc/os-release", 'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\n'
                          'VERSION_ID="12"\nVERSION="12 (bookworm)"\nID=debian\n')
    t.f("etc/motd", "\nThe programs included with the Debian GNU/Linux system are free software.\n")
    t.f("etc/shells", "/bin/sh\n/bin/bash\n/usr/bin/bash\n")
    t.f("etc/sudoers", "Defaults\tenv_reset\nroot\tALL=(ALL:ALL) ALL\n%sudo\tALL=(ALL:ALL) ALL\n"
                       "@includedir /etc/sudoers.d\n", 0o440)
    for name in ("bash", "ls", "cat", "cp", "mv", "rm", "grep", "sed", "ssh", "sha256sum", "last", "passwd"):
        t.f(f"usr/bin/{name}", b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 56, 0o755)
    for name in ("sshd", "usermod", "deluser"):
        t.f(f"usr/sbin/{name}", b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 56, 0o755)
    t.f("root/.bashrc", BASHRC, 0o600)
    home = f"home/{student_id}"
    t.d(home, 0o755)
    t.f(f"{home}/.bashrc", BASHRC)
    t.f(f"{home}/.profile", PROFILE)
    return home


def write_task_md(lab, root, student_id, params):
    path = Path(root) / "home" / student_id / "TASK.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(lab.task_markdown(params, student_id), encoding="utf-8")
    os.chmod(path, 0o644)


def main(lab, make_params, build, description, keep_keys):
    """keep_keys — значения params, которые сохраняются при восстановлении песочницы."""
    ap = argparse.ArgumentParser(description=description)
    who = ap.add_mutually_exclusive_group(required=True)
    who.add_argument("--group", help="student_group (например IB)")
    who.add_argument("--student", help="один студент (например st-test-001)")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--out", default=str(REPO_ROOT / "data" / "ctf" / lab.sandbox_dir))
    ap.add_argument("--force", action="store_true",
                    help="выдать заново: новые значения, песочница с нуля, прогресс обнуляется")
    ap.add_argument("--refresh-task", action="store_true",
                    help="только переписать ~/TASK.md (значения и прогресс сохраняются)")
    args = ap.parse_args()
    if args.force and args.refresh_task:
        sys.exit("--force и --refresh-task несовместимы")

    out_root = Path(args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    lab_task.ensure_tables(conn)
    students = ensure_users(conn, args.group, args.student)

    created = restored = skipped = 0
    for student_id in students:
        rng = random.Random()
        root = (out_root / student_id).resolve()
        if root.parent != out_root:
            sys.exit(f"Подозрительный путь песочницы: {root}")
        row = lab.load_row(conn, student_id)
        if args.refresh_task:
            if not (row and root.exists()):
                skipped += 1
                continue
            write_task_md(lab, root, student_id, json.loads(row["params"]))
            restored += 1
            print(f"  {student_id}: TASK.md обновлён")
            continue
        if row and not args.force and root.exists():
            skipped += 1
            continue
        if row and not args.force:
            base = {k: v for k, v in json.loads(row["params"]).items() if k in keep_keys}
            base = {**make_params(rng, student_id), **base}
        else:
            base = make_params(rng, student_id)
        if root.exists():
            force_rmtree(root)
        params = build(root, student_id, dict(base), rng)
        write_task_md(lab, root, student_id, params)
        if row and args.force:
            lab.reset_row(conn, student_id, params)
            created += 1
        elif row:
            conn.execute("UPDATE ib_lab_tasks SET params=? WHERE task=? AND student_id=?",
                         (json.dumps(params, ensure_ascii=False), lab.key, student_id))
            restored += 1
        else:
            lab.insert_row(conn, student_id, params)
            created += 1
        conn.commit()
        print(f"  {student_id}: " + ", ".join(f"{k}={params[k]}" for k in keep_keys if k in params))
    conn.close()
    if args.refresh_task:
        print(f"Готово: TASK.md обновлён у {restored}, пропущено (задание не выдано) {skipped}.")
        return
    print(f"Готово: выдано {created}, восстановлено {restored}, пропущено (уже есть) {skipped}. Песочницы: {out_root}")
