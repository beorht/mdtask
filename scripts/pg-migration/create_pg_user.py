#!/usr/bin/env python3
"""
Создаёт в PostgreSQL отдельного пользователя и базу для mdtask со сгенерированным паролем
и сохраняет параметры подключения в конфиг.

Подключение администратора — через psql (должен быть установлен там, где запускается скрипт,
и PostgreSQL должен быть доступен по сети, например через VPN). Пароль администратора psql
спросит сам или возьмёт из PGPASSWORD / ~/.pgpass.

    python3 scripts/pg-migration/create_pg_user.py --host 10.8.0.1 --admin-user postgres
    python3 scripts/pg-migration/create_pg_user.py --host 10.8.0.1 --user mdtask_app --database mdtask --rotate

Что делает:
  1. генерирует пароль (32 символа: буквы и цифры);
  2. создаёт роль LOGIN (или с --rotate меняет пароль существующей). На сервер уходит
     не сам пароль, а его SCRAM-SHA-256-хеш — пароль не попадает ни в журналы сервера,
     ни в список процессов;
  3. создаёт базу, владелец — новый пользователь; подключаться к ней могут только он
     (и суперпользователи);
  4. сохраняет конфиг (по умолчанию data/migration/pg-connection.env, права 600):
     PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, DATABASE_URL.
Пароль на экран не выводится — он только в конфиге.
"""

import argparse
import base64
import hashlib
import hmac
import os
import re
import secrets
import string
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
NAME_RE = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


def generate_password(length=32):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def scram_sha256(password, iterations=4096):
    """Хеш пароля в формате PostgreSQL: SCRAM-SHA-256$<iter>:<salt>$<StoredKey>:<ServerKey>."""
    salt = secrets.token_bytes(16)
    salted = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    b64 = lambda b: base64.b64encode(b).decode()
    return f"SCRAM-SHA-256${iterations}:{b64(salt)}${b64(stored_key)}:{b64(server_key)}"


def psql(args, sql, capture=False):
    cmd = ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-q", "-h", args.host, "-p", str(args.port),
           "-U", args.admin_user, "-d", args.admin_db, "-tA", "-f", "-"]
    result = subprocess.run(cmd, input=sql, text=True, capture_output=capture)
    if result.returncode != 0:
        sys.exit(f"psql завершился с ошибкой (код {result.returncode}){': ' + result.stderr.strip() if capture else ''}")
    return result.stdout.strip() if capture else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", required=True, help="адрес сервера PostgreSQL (например, адрес в VPN)")
    ap.add_argument("--port", type=int, default=5432)
    ap.add_argument("--admin-user", default="postgres", help="пользователь, который может создавать роли и базы")
    ap.add_argument("--admin-db", default="postgres")
    ap.add_argument("--user", default="mdtask_app", help="имя нового пользователя")
    ap.add_argument("--database", default="mdtask", help="имя базы")
    ap.add_argument("--rotate", action="store_true", help="пользователь уже есть — сменить ему пароль")
    ap.add_argument("--config", default=os.path.join(ROOT, "data", "migration", "pg-connection.env"))
    args = ap.parse_args()

    for value, what in ((args.user, "имя пользователя"), (args.database, "имя базы")):
        if not NAME_RE.match(value):
            sys.exit(f"{what} «{value}»: только маленькие латинские буквы, цифры и _, не с цифры")

    exists = psql(args, f"SELECT 1 FROM pg_roles WHERE rolname = '{args.user}';", capture=True) == "1"
    if exists and not args.rotate:
        sys.exit(f"Пользователь {args.user} уже есть. Чтобы сменить ему пароль, добавьте --rotate.")

    password = generate_password()
    verifier = scram_sha256(password)
    verb = "ALTER ROLE" if exists else "CREATE ROLE"
    login = "" if exists else " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE"
    psql(args, f"{verb} \"{args.user}\"{login} PASSWORD '{verifier}';\n")
    print(f"{'Пароль пользователя ' + args.user + ' изменён' if exists else 'Создан пользователь ' + args.user}")

    db_exists = psql(args, f"SELECT 1 FROM pg_database WHERE datname = '{args.database}';", capture=True) == "1"
    if not db_exists:
        psql(args, f"CREATE DATABASE \"{args.database}\" OWNER \"{args.user}\" ENCODING 'UTF8' TEMPLATE template0;\n")
        print(f"Создана база {args.database} (владелец {args.user})")
    else:
        print(f"База {args.database} уже есть — оставлена как есть")
    psql(args, f"REVOKE CONNECT ON DATABASE \"{args.database}\" FROM PUBLIC;\n"
               f"GRANT CONNECT, TEMPORARY ON DATABASE \"{args.database}\" TO \"{args.user}\";\n")

    os.makedirs(os.path.dirname(args.config), exist_ok=True)
    fd = os.open(args.config, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write("# Подключение mdtask к PostgreSQL (создано scripts/pg-migration/create_pg_user.py).\n"
                "# Секрет: не публиковать, не коммитить. Использование: set -a; . этот_файл; set +a\n"
                f"PGHOST={args.host}\nPGPORT={args.port}\nPGDATABASE={args.database}\nPGUSER={args.user}\n"
                f"PGPASSWORD={password}\n"
                f"DATABASE_URL=postgresql://{args.user}:{password}@{args.host}:{args.port}/{args.database}\n")
    os.chmod(args.config, 0o600)
    print(f"Параметры подключения сохранены в {os.path.relpath(args.config, ROOT)} (права 600)")


if __name__ == "__main__":
    main()
