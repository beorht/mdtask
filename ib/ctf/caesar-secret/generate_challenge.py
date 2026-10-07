#!/usr/bin/env python3
"""
№3. Генератор задания «Пароль от защищённой базы, зашифрованный Цезарем».

Цель студента: найти пароль от защищённой базы данных
(PROTECTED_DB_NAME, вымышленные «секретные» данные) и открыть её командой
`sqlite3` в терминале — она запросит пароль. Успешное открытие отмечает
задание решённым.

Для каждого студента указанной группы:
  1. Генерирует случайный пароль и случайный сдвиг Цезаря (2..25)
  2. Шифрует пароль этим сдвигом; базу с данными, зашифрованную этим
     паролем (server/protected_db.py), кладёт в песочницу
  3. Записывает (student_id, shift, пароль, шифротекст, путь до файла)
     в таблицу ctf_caesar_secrets в mdtask.db
  4. Кладёт в песочницу студента (data/ctf/caesar/<student_id>/):
       - стандартный "скелет" домашнего каталога Linux (Desktop, Documents,
         .bashrc, .bash_history и т.п.) с обманками на всех местах, куда
         мог бы лечь скрытый файл — чтобы реальный файл не выделялся
       - реальный скрытый файл с шифротекстом и намёком (в одном из мест
         из этого же скелета, выбранном случайно на студента)
       - TASK.md — условие задания (студенческая часть TASK.md из корня репозитория)

Варианты (--variant):
  password  в скрытом файле — сам пароль, зашифрованный Цезарем (по умолчанию)
  path      усложнённый: в скрытом файле зашифрован ПУТЬ к другому файлу,
            где пароль лежит открытым текстом (тоже среди обманок пула)

Использование:
    ./generate_challenge.py --group IB
    ./generate_challenge.py --group IB --db /path/to/mdtask.db --out /path/to/data/ctf/caesar
    ./generate_challenge.py --group IB --force   # перегенерировать даже тем, у кого уже есть запись
    ./generate_challenge.py --group IB --variant path --force   # перевести группу на усложнённый вариант

По умолчанию:
  - не трогает студентов, для которых запись уже существует (не создаёт новый
    пароль/файл повторно) — безопасно перезапускать на новых студентах группы
  - НЕ перезаписывает уже существующие на диске файлы скелета/обманок —
    можно спокойно донести новый набор обманок старым студентам, не потеряв
    их уже сгенерированный реальный файл и пароль
"""

import argparse
import random
import sqlite3
import string
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Формат защищённой базы общий с терминалом — модуль лежит в server/.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "server"))
import protected_db  # noqa: E402

WORDS = [
    "Falcon", "Compass", "Ember", "Granite", "Harbor", "Juniper", "Lantern",
    "Meridian", "Nebula", "Orchid", "Quartz", "Ridge", "Sable", "Thicket",
    "Umbra", "Vertex", "Willow", "Zephyr", "Basalt", "Cobalt", "Driftwood",
]

# Все пути-кандидаты для скрытого файла, сгруппированные по каталогам.
# Всем им, кроме выбранного для конкретного студента, генератор кладёт
# правдоподобную обманку — по имени файла не понять, тот ли это файл.
# В каждом каталоге несколько файлов: подсказка в .bash_history указывает
# только каталог, дальше студенту нужно проверить файлы в нём.
# Пул специально больше числа студентов в группе — при генерации путь
# каждому назначается БЕЗ повторов (см. main), чтобы ни у каких двух
# студентов не совпадало место, где искать файл.
# Пути из первой версии пула (24 шт.) сохранены — на них уже лежат
# реальные файлы ранее сгенерированных студентов.
HIDDEN_DIRS = {
    ".cache/.fontconfig": [".uuid.bak", ".uuid.old", ".fonts.lock", ".conf-cache", ".cache-7.bak"],
    ".local/share": [".recently-used.bak", ".trash-info.bak", ".xbel-old", ".user-places.bak"],
    ".config/.dconf": [".user-cache", ".user.old", ".profile.bak", ".lock-cache"],
    ".ssh": [".known_hosts.old", ".authorized_keys.bak", ".config.bak", ".id_rsa.old", ".agent-sock.bak"],
    ".bash_sessions": [".meta", ".history.bak", ".session-old", ".restore"],
    ".local/state": [".wal.bak", ".session-crash", ".lesshst.bak", ".python_history.bak"],
    ".config/.pulse": [".cookie-old", ".client.conf.bak", ".default-sink.old", ".runtime.lock"],
    ".cache/mozilla": [".lock.bak", ".parent.lock.old", ".startupCache.bak", ".sessionstore.bak"],
    ".cache/thumbnails": [".index.dat", ".fail-cache", ".large-index.bak", ".normal-index.old"],
    ".config/autostart": [".session.bak", ".tracker.desktop.bak", ".xdg-old", ".startup.lock"],
    ".config/systemd": [".user-state", ".units-cache", ".timers.bak", ".env.old"],
    ".local/share/keyrings": [".default-old", ".login.keyring.bak", ".user.keystore.old", ".session-cache"],
    ".local/share/gvfs-metadata": [".home-uuid", ".root-uuid", ".trash.bak", ".home.log.old"],
    ".config/ibus": [".bus-lock", ".engine-cache", ".bus.bak", ".registry.old"],
    ".cache/gstreamer-1.0": [".registry-bak", ".registry.x86_64.old", ".plugins-cache", ".scan.lock"],
    ".local/state/wireplumber": [".dump", ".restore-stream.bak", ".default-nodes.old", ".sm-settings.bak"],
    ".config/dconf": [".shadow-cache", ".user.bak", ".profile.old", ".db-lock"],
    ".cache/evolution": [".accounts-old", ".addressbook.bak", ".calendar-cache", ".mail.lock"],
    ".config/goa-1.0": [".accounts.bak", ".accounts.conf.old", ".identity-cache", ".provider.lock"],
    ".local/share/applications": [".mimeapps-old", ".defaults.list.bak", ".mimeinfo.cache.bak", ".desktop-cache"],
    ".cache/dconf": [".user.bak", ".user.old", ".cache-lock", ".db-snapshot"],
    ".config": ["user-dirs.dirs.bak", ".monitors.xml.bak", ".mimeapps.list.old", ".gtk-bookmarks.bak"],
    ".gnupg": [".pubring.kbx.bak", ".trustdb.old", ".random_seed.bak", ".gpg-agent.conf.old"],
    ".cache/pip": [".selfcheck.bak", ".http-cache.idx", ".wheels.lock", ".pip-old"],
    ".config/htop": [".htoprc.bak", ".htoprc.old", ".meters.cache"],
    ".local/share/nano": [".search_history.bak", ".filepos_history.old", ".nano-lock"],
    ".local/share/Trash/info": [".trashinfo.bak", ".deleted-old", ".restore.idx"],
    ".cache/vim": [".viminfo.bak", ".swap-old", ".undo.idx"],
    ".config/git": [".credentials.bak", ".config.old", ".ignore.bak"],
    ".cache/npm/_logs": [".debug-0.log.bak", ".debug-1.log.old", ".install.lock"],
}

HIDDEN_NAME_POOL = [f"{d}/{name}" for d, names in HIDDEN_DIRS.items() for name in names]
assert len(HIDDEN_NAME_POOL) == len(set(HIDDEN_NAME_POOL)) >= 100

# Стандартные каталоги домашней директории Linux (XDG user dirs) — создаются
# всем, независимо от того, где спрятан реальный файл, чтобы песочница
# выглядела как обычный домашний каталог, а не как "тут явно что-то спрятано".
STANDARD_DIRS = [
    "Desktop", "Documents", "Downloads", "Music", "Pictures", "Public",
    "Templates", "Videos", ".config", ".cache", ".local/share", ".local/state",
]

PROTECTED_DB_NAME = "Documents/backup/company_data.db"

# Условие задания для студента — TASK.md в корне репозитория.
# В песочницу кладётся только студенческая часть (без раздела с ответами).
VARIANTS = ("password", "path")
# Файлы условия из прошлых версий генератора — удаляются из песочниц.
OBSOLETE_FILES = ("ЗАДАНИЕ.txt", "help.txt")
TASK_MD_SOURCE = Path(__file__).resolve().parents[2] / "TASK.md"
# Корень репозитория mdtask (этот файл — mdtask/ib/ctf/caesar-secret/...).
REPO_ROOT = Path(__file__).resolve().parents[3]
TEACHER_SECTION = "## Для преподавателя"

HIDDEN_HEADERS = {
    "password": "# резервная копия :: ключ доступа к архиву базы данных\n"
                "# восстановлено из старого бэкапа системы\n",
    "path": "# резервная копия :: ключ доступа к архиву базы данных\n"
            "# расположение файла с паролем (восстановлено из старого бэкапа)\n",
}


def caesar_encrypt(text: str, shift: int) -> str:
    result = []
    for ch in text:
        if ch.isalpha():
            base = ord('A') if ch.isupper() else ord('a')
            result.append(chr((ord(ch) - base + shift) % 26 + base))
        else:
            result.append(ch)
    return "".join(result)


def gen_password(rng: random.Random) -> str:
    word = rng.choice(WORDS)
    digits = "".join(rng.choice(string.digits) for _ in range(3))
    return f"{word}{digits}"


def hexstr(rng: random.Random, n: int) -> str:
    return "".join(rng.choice("0123456789abcdef") for _ in range(n))


def decoy_content(rel_path: str, rng: random.Random) -> str:
    """Правдоподобное содержимое для НЕ выбранного пути-кандидата."""
    name = rel_path.rsplit("/", 1)[-1]
    if "lock" in name:
        return f"{rng.randint(1200, 65000)}\n"
    if ".log" in name:
        return f"{rng.randint(0, 9)} verbose cli /usr/bin/node /usr/bin/npm\n1 info using npm@10.{rng.randint(0, 9)}.0\n"
    if "history" in name or "lesshst" in name:
        return "\n".join(rng.sample(BASH_HISTORY_LINES, 4)) + "\n"
    if name.endswith(".desktop.bak"):
        return "[Desktop Entry]\nType=Application\nHidden=false\nX-GNOME-Autostart-enabled=true\n"
    if "htoprc" in name or "conf" in name:
        return f"# generated, do not edit\nversion={rng.randint(1, 4)}\nchecksum={hexstr(rng, 16)}\n"
    if rel_path.endswith(".uuid.bak"):
        return str(uuid.UUID(int=rng.getrandbits(128))) + "\n"
    if rel_path.endswith(".recently-used.bak"):
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<RecentFiles>\n</RecentFiles>\n"
    if rel_path.endswith(".user-cache"):
        return "GVariant cache v1\n" + hexstr(rng, 48) + "\n"
    if rel_path.endswith(".known_hosts.old"):
        return f"192.168.1.{rng.randint(2,254)} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI{hexstr(rng, 40)}\n"
    if rel_path.endswith(".meta"):
        return f"session_id={uuid.UUID(int=rng.getrandbits(128)).hex}\ncreated={datetime.now().isoformat()}\n"
    if rel_path.endswith(".wal.bak"):
        return "-- sqlite WAL checkpoint --\nframe_count=0\n"
    if rel_path.endswith(".cookie-old"):
        return hexstr(rng, 32) + "\n"
    return hexstr(rng, 24) + "\n"


BASH_HISTORY_LINES = [
    "ls -la", "cd Documents", "cat lecture_notes.txt", "cd ..",
    "whoami", "pwd", "cd Downloads", "ls", "cd ..", "clear", "history",
]

BASHRC = (
    "# ~/.bashrc\n"
    "export PS1='\\u@seclab:\\w$ '\n"
    "alias ll='ls -la'\n"
    "alias ..='cd ..'\n"
)

PROFILE = "# ~/.profile\nif [ -f ~/.bashrc ]; then . ~/.bashrc; fi\n"

DECOY_DOCUMENTS = {
    "Documents/lecture_notes.txt": (
        "Конспект: основы сетевой безопасности\n\n"
        "1. Модель OSI и стек TCP/IP\n"
        "2. Основные типы атак (MITM, DoS, спуфинг)\n"
        "3. Firewall, IDS/IPS\n"
    ),
    "Downloads/install.log": (
        "Setup completed successfully.\n"
        "Package: openssh-server 9.6p1\n"
        "Package: openssl 3.0.13\n"
    ),
    "Documents/report_draft.txt": "Черновик отчёта по лабораторной работе №2.\n(не закончено)\n",
}


# Команды, которые в .bash_history намекают на каталог со скрытым файлом.
# Сам файл не назван: в каталоге несколько обманок, нужный придётся найти.
HINT_LINES = [
    "cd ~/{dir}",
    "sudo cp /var/backups/admin-pass.bak .",
    "ls -a",
    "cd ~",
]


def write_bash_history(student_dir: Path, student_id: str, hidden_rel: str):
    """Перезаписывает .bash_history: шум + подсказка о каталоге скрытого файла.

    rng детерминирован от (студент, путь) — повторные запуски генератора
    дают тот же файл, пока путь не изменится."""
    rng = random.Random(f"{student_id}:{hidden_rel}")
    hidden_dir = hidden_rel.rsplit("/", 1)[0]
    noise = BASH_HISTORY_LINES[:]
    rng.shuffle(noise)
    pos = rng.randint(2, len(noise) - 2)
    hint = [l.format(dir=hidden_dir) for l in HINT_LINES]
    lines = noise[:pos] + hint + noise[pos:]
    (student_dir / ".bash_history").write_text("\n".join(lines) + "\n")


DEMO_DB_NAME = "Documents/inventory.db"


def ensure_demo_db(student_dir: Path):
    """Учебная база для команды sqlite3 в терминале (создаётся один раз)."""
    db_path = student_dir / DEMO_DB_NAME
    if db_path.exists():
        return
    conn = sqlite3.connect(db_path)
    conn.executescript("""
        CREATE TABLE hosts (
          id INTEGER PRIMARY KEY,
          hostname TEXT NOT NULL,
          ip TEXT NOT NULL,
          os TEXT
        );
        CREATE TABLE services (
          id INTEGER PRIMARY KEY,
          host_id INTEGER NOT NULL REFERENCES hosts(id),
          port INTEGER NOT NULL,
          name TEXT NOT NULL
        );
        CREATE TABLE incidents (
          id INTEGER PRIMARY KEY,
          host_id INTEGER REFERENCES hosts(id),
          detected_at TEXT NOT NULL,
          severity TEXT CHECK (severity IN ('low','medium','high')),
          description TEXT
        );
        INSERT INTO hosts (hostname, ip, os) VALUES
          ('gw-01', '10.0.0.1', 'OpenWrt 23.05'),
          ('web-01', '10.0.1.10', 'Ubuntu 22.04'),
          ('db-01', '10.0.1.20', 'Debian 12'),
          ('ws-17', '10.0.2.17', 'Windows 10');
        INSERT INTO services (host_id, port, name) VALUES
          (1, 22, 'ssh'), (1, 53, 'dns'),
          (2, 22, 'ssh'), (2, 80, 'http'), (2, 443, 'https'),
          (3, 22, 'ssh'), (3, 5432, 'postgresql'),
          (4, 3389, 'rdp'), (4, 445, 'smb');
        INSERT INTO incidents (host_id, detected_at, severity, description) VALUES
          (2, '2026-09-01 03:12', 'medium', 'Перебор паролей SSH'),
          (4, '2026-09-03 14:40', 'high', 'Открытый RDP наружу'),
          (3, '2026-09-10 22:05', 'low', 'Устаревший пакет openssl'),
          (2, '2026-09-15 09:30', 'high', 'SQL-инъекция в форме поиска');
    """)
    conn.commit()
    conn.close()


def build_protected_db(student_id: str) -> bytes:
    """Содержимое защищённой базы: вымышленные «секретные» данные компании."""
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE info (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY,
          full_name TEXT NOT NULL,
          position TEXT,
          department TEXT,
          phone TEXT,
          email TEXT,
          salary INTEGER
        );
        CREATE TABLE accounts (
          id INTEGER PRIMARY KEY,
          service TEXT NOT NULL,
          login TEXT NOT NULL,
          password TEXT NOT NULL,
          owner_id INTEGER REFERENCES employees(id)
        );
        CREATE TABLE documents (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          classification TEXT CHECK (classification IN ('internal','confidential','secret')),
          owner_id INTEGER REFERENCES employees(id),
          created_at TEXT
        );
        INSERT INTO employees (full_name, position, department, phone, email, salary) VALUES
          ('Иванов Пётр Сергеевич', 'Генеральный директор', 'Руководство', '+7-000-000-01-01', 'p.ivanov@example.com', 450000),
          ('Смирнова Анна Олеговна', 'Финансовый директор', 'Финансы', '+7-000-000-01-02', 'a.smirnova@example.com', 380000),
          ('Ким Денис Алексеевич', 'Системный администратор', 'ИТ', '+7-000-000-01-03', 'd.kim@example.com', 190000),
          ('Рахимова Лола Тимуровна', 'Бухгалтер', 'Финансы', '+7-000-000-01-04', 'l.rakhimova@example.com', 120000),
          ('Орлов Игорь Викторович', 'Инженер ИБ', 'ИТ', '+7-000-000-01-05', 'i.orlov@example.com', 210000);
        INSERT INTO accounts (service, login, password, owner_id) VALUES
          ('vpn.example.com', 'p.ivanov', 'Spring2024!', 1),
          ('mail.example.com', 'a.smirnova', 'qwerty123', 2),
          ('srv-db-01', 'root', 'toor', 3),
          ('1c.example.com', 'buh', '12345678', 4),
          ('siem.example.com', 'i.orlov', 'S1em#Pa55', 5);
        INSERT INTO documents (title, classification, owner_id, created_at) VALUES
          ('Бюджет на 2027 год', 'confidential', 2, '2026-08-14'),
          ('Схема сети головного офиса', 'secret', 3, '2026-06-02'),
          ('Отчёт о пентесте Q3', 'secret', 5, '2026-09-20'),
          ('Список контрагентов', 'internal', 4, '2026-07-01'),
          ('План слияния с ООО «Пример»', 'secret', 1, '2026-09-28');
    """)
    conn.executemany("INSERT INTO info VALUES (?, ?)", [
        ("notice", "Все данные вымышлены и созданы в учебных целях (SecLab, задание №3)"),
        ("owner", student_id),
    ])
    conn.commit()
    data = conn.serialize()
    conn.close()
    return data


def write_protected_db(student_dir: Path, student_id: str, password: str):
    path = student_dir / PROTECTED_DB_NAME
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(protected_db.encrypt(build_protected_db(student_id), password))


def student_task_md() -> str:
    """Студенческая часть TASK.md (без раздела для преподавателя)."""
    text = TASK_MD_SOURCE.read_text(encoding="utf-8")
    cut = text.find(TEACHER_SECTION)
    if cut != -1:
        text = text[:cut].rstrip().removesuffix("---").rstrip() + "\n"
    return text


def ensure_skeleton(student_dir: Path, rng: random.Random):
    """Создаёт стандартные каталоги, дотфайлы и обманки — только то, чего ещё нет."""
    for d in STANDARD_DIRS:
        (student_dir / d).mkdir(parents=True, exist_ok=True)

    dotfiles = {
        ".bashrc": BASHRC,
        ".bash_profile": PROFILE,
        ".profile": PROFILE,
        ".bash_logout": "",
        ".bash_history": "\n".join(BASH_HISTORY_LINES) + "\n",
    }
    for name, content in dotfiles.items():
        f = student_dir / name
        if not f.exists():
            f.write_text(content)

    for rel, content in DECOY_DOCUMENTS.items():
        f = student_dir / rel
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(content)

    for rel in HIDDEN_NAME_POOL:
        f = student_dir / rel
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(decoy_content(rel, rng))

    ensure_demo_db(student_dir)

    (student_dir / "TASK.md").write_text(student_task_md())
    for name in OBSOLETE_FILES:
        (student_dir / name).unlink(missing_ok=True)


def ensure_columns(conn):
    """Миграция таблицы первой версии: колонки для варианта задания."""
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(ctf_caesar_secrets)")}
    if "variant" not in cols:
        conn.execute("ALTER TABLE ctf_caesar_secrets ADD COLUMN variant TEXT NOT NULL DEFAULT 'password'")
    if "password_file_path" not in cols:
        conn.execute("ALTER TABLE ctf_caesar_secrets ADD COLUMN password_file_path TEXT")


def row_paths(row):
    """Пути пула, занятые записью: скрытый файл и (для варианта path) файл с паролем."""
    paths = [row["hidden_file_path"]]
    if row["password_file_path"]:
        paths.append(row["password_file_path"])
    return [p.removeprefix("~/") for p in paths]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--group", required=True, help="student_group для генерации (например IB)")
    ap.add_argument("--db", default=str(REPO_ROOT / "data" / "mdtask.db"))
    ap.add_argument("--out", default=str(REPO_ROOT / "data" / "ctf" / "caesar"))
    ap.add_argument("--force", action="store_true", help="перегенерировать даже существующие записи (новый пароль/путь)")
    ap.add_argument("--variant", choices=VARIANTS, default="password",
                    help="password — зашифрован пароль; path — зашифрован путь к файлу с паролем")
    args = ap.parse_args()

    rng = random.Random()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ctf_caesar_secrets (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL REFERENCES users(id),
          caesar_shift INTEGER NOT NULL,
          plain_password TEXT NOT NULL,
          cipher_text TEXT NOT NULL,
          hidden_file_path TEXT NOT NULL,
          solved INTEGER NOT NULL DEFAULT 0,
          solved_at TEXT,
          created_at TEXT NOT NULL,
          variant TEXT NOT NULL DEFAULT 'password',
          password_file_path TEXT
        )
    """)
    ensure_columns(conn)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ctf_caesar_secrets_student ON ctf_caesar_secrets(student_id)")
    conn.commit()

    students = conn.execute(
        "SELECT id, name FROM users WHERE role='student' AND student_group=?",
        (args.group,),
    ).fetchall()

    if not students:
        print(f"Не найдено студентов в группе '{args.group}'", file=sys.stderr)
        sys.exit(1)

    out_root = Path(args.out)
    created, skipped = 0, 0

    # Кому реально будем (пере)назначать путь в этом запуске.
    existing_rows = {
        row["student_id"]: row
        for row in conn.execute(
            "SELECT student_id, hidden_file_path, password_file_path, variant, plain_password FROM ctf_caesar_secrets"
        ).fetchall()
    }
    to_process = [
        (sid, name) for sid, name in students
        if args.force or sid not in existing_rows
    ]

    # Пути студентов группы, которых этот запуск не трогает, уже заняты.
    taken = {
        p
        for sid, _ in students
        if sid in existing_rows and not args.force
        for p in row_paths(existing_rows[sid])
    }
    free_pool = [p for p in HIDDEN_NAME_POOL if p not in taken]

    # Вариант path занимает два пути на студента: скрытый файл и файл с паролем.
    per_student = 2 if args.variant == "path" else 1
    need = len(to_process) * per_student
    if need > len(free_pool):
        print(
            f"ВНИМАНИЕ: нужно путей ({need}) больше, чем свободных "
            f"в пуле ({len(free_pool)}) — некоторым путь неизбежно повторится. "
            f"Добавьте ещё вариантов в HIDDEN_DIRS.",
            file=sys.stderr,
        )
        assigned = [rng.sample(HIDDEN_NAME_POOL, k=per_student) for _ in to_process]
    else:
        flat = rng.sample(free_pool, k=need)
        assigned = [flat[i:i + per_student] for i in range(0, need, per_student)]
    paths_by_student = dict(zip((sid for sid, _ in to_process), assigned))

    for student_id, name in students:
        student_dir = out_root / student_id
        student_dir.mkdir(parents=True, exist_ok=True)

        # Скелет + обманки — донести всем, не трогая уже существующие файлы
        # (в т.ч. уже сгенерированный ранее реальный скрытый файл).
        ensure_skeleton(student_dir, rng)

        existing = existing_rows.get(student_id)
        if existing and not args.force:
            write_bash_history(student_dir, student_id, existing["hidden_file_path"].removeprefix("~/"))
            # Записи, созданные до появления защищённой базы, получают её
            # с уже выданным паролем — пароль и файлы студента не меняются.
            if not (student_dir / PROTECTED_DB_NAME).exists():
                write_protected_db(student_dir, student_id, existing["plain_password"])
            skipped += 1
            continue

        # При перегенерации возвращаем старым путям обманочное содержимое,
        # чтобы там не остались настоящие шифротекст/пароль вперемешку с новыми.
        if existing:
            for old_rel in row_paths(existing):
                old_file = student_dir / old_rel
                if old_file.exists():
                    old_file.write_text(decoy_content(old_rel, rng))

        shift = rng.randint(2, 25)
        password = gen_password(rng)
        hidden_rel = paths_by_student[student_id][0]
        hidden_abs = f"~/{hidden_rel}"

        if args.variant == "path":
            pw_rel = paths_by_student[student_id][1]
            pw_abs = f"~/{pw_rel}"
            cipher = caesar_encrypt(pw_abs, shift)
            (student_dir / pw_rel).parent.mkdir(parents=True, exist_ok=True)
            (student_dir / pw_rel).write_text(f"{password}\n")
        else:
            pw_abs = None
            cipher = caesar_encrypt(password, shift)

        write_bash_history(student_dir, student_id, hidden_rel)
        write_protected_db(student_dir, student_id, password)

        hidden_path = student_dir / hidden_rel
        hidden_path.parent.mkdir(parents=True, exist_ok=True)
        hidden_path.write_text(HIDDEN_HEADERS[args.variant] + f"{cipher}\n")

        row_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        if existing:
            conn.execute(
                """UPDATE ctf_caesar_secrets
                   SET caesar_shift=?, plain_password=?, cipher_text=?, hidden_file_path=?,
                       variant=?, password_file_path=?,
                       solved=0, solved_at=NULL, created_at=?
                   WHERE student_id=?""",
                (shift, password, cipher, hidden_abs, args.variant, pw_abs, now, student_id),
            )
        else:
            conn.execute(
                """INSERT INTO ctf_caesar_secrets
                   (id, student_id, caesar_shift, plain_password, cipher_text, hidden_file_path,
                    variant, password_file_path, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (row_id, student_id, shift, password, cipher, hidden_abs, args.variant, pw_abs, now),
            )
        conn.commit()
        created += 1
        extra = f" pwfile={pw_abs}" if pw_abs else ""
        print(f"{student_id:12s} {name:40s} shift={shift:<3d} file={hidden_abs}{extra}")

    conn.close()
    print(f"\nГотово: создано/обновлено {created}, пропущено (уже было) {skipped}.")


if __name__ == "__main__":
    main()
