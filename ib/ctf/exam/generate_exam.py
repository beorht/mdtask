#!/usr/bin/env python3
"""
Итоговая контрольная группы IB: песочница терминала одного студента.

Содержимое (конфиги, журналы, база, скрытый ключ, защищённая база) придумывает mdtask
(src/lib/exam/scenario.js) — по зерну варианта студента; этот скрипт только раскладывает его
по диску тем же способом, что и генераторы заданий №3–№7: каркас учебного сервера Debian
(lab_gen.base_system), права файлов, обычная база SQLite и база, защищённая паролем
(server/protected_db.py — формат, который открывает sqlite3 в терминале).

Вход — JSON в stdin:
    {"base": "<каталог песочниц>", "student": "<id>", "files": [{"path", "content", "mode"}],
     "databases": [{"path", "sql", "mode"}], "protected": {"path", "password", "sql"}}
В путях {user} заменяется на id студента. Песочница пересоздаётся с нуля: <base>/<student>/.
Выход — JSON {"ok": true, "root": "..."}.

Вызывает src/lib/exam/sandbox.js (выдача вариантов в админке и scripts/exam/issue.js).
"""

import json
import os
import random
import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "server"))
from lab_gen import Tree, base_system, fake_hash  # noqa: E402
from generate_terminal import force_rmtree  # noqa: E402
import protected_db  # noqa: E402


def db_bytes(sql):
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "x.db")
        conn = sqlite3.connect(path)
        conn.executescript(sql)
        conn.commit()
        conn.close()
        return Path(path).read_bytes()


def build(spec):
    student = spec["student"]
    if not student or "/" in student or student.startswith("."):
        raise SystemExit(f"Подозрительный id студента: {student!r}")
    base = Path(spec["base"]).resolve()
    base.mkdir(parents=True, exist_ok=True)
    root = (base / student).resolve()
    if root.parent != base:
        raise SystemExit(f"Подозрительный путь песочницы: {root}")
    if root.exists():
        force_rmtree(root)
    sub = lambda p: p.replace("{user}", student)  # noqa: E731

    t = Tree(root)
    home = base_system(t, student)
    rng = random.Random(student)
    t.f("etc/passwd", "\n".join([
        "root:x:0:0:root:/root:/bin/bash",
        "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
        "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
        f"{student}:x:1000:1000:Администратор,,,:/home/{student}:/bin/bash",
        "svc:x:998:998:Служба приложения:/nonexistent:/usr/sbin/nologin",
    ]) + "\n")
    t.f("etc/shadow", "\n".join([
        "root:!:19600:0:99999:7:::",
        "daemon:*:19600:0:99999:7:::",
        "www-data:*:19600:0:99999:7:::",
        f"{student}:{fake_hash(rng)}:19800:0:99999:7:::",
        "svc:!:19800:0:99999:7:::",
    ]) + "\n", 0o640)
    t.f("etc/group", f"root:x:0:\nadm:x:4:{student}\nsudo:x:27:{student}\n{student}:x:1000:\nsvc:x:998:\n")
    for d in ("etc/systemd", "etc/systemd/system", "var/backups", "usr/share", "usr/share/doc"):
        t.d(d)

    for f in spec.get("files", []):
        rel = sub(f["path"])
        parent = os.path.dirname(rel)
        while parent and parent not in t.modes:
            t.d(parent)
            parent = os.path.dirname(parent)
        t.f(rel, f["content"], int(f.get("mode", "644"), 8))
    for d in spec.get("databases", []):
        t.f(sub(d["path"]), db_bytes(d["sql"]), int(d.get("mode", "640"), 8))
    prot = spec.get("protected")
    if prot:
        t.f(sub(prot["path"]), protected_db.encrypt(db_bytes(prot["sql"]), prot["password"]), 0o600)
    # каталоги внутри домашнего — студента, с обычными правами
    for rel in list(t.modes):
        if rel.startswith(home + "/") and (root / rel).is_dir():
            t.modes[rel] = 0o700 if os.path.basename(rel).startswith(".") else 0o755
    t.finish()
    return root


def main():
    spec = json.load(sys.stdin)
    root = build(spec)
    print(json.dumps({"ok": True, "root": str(root)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
