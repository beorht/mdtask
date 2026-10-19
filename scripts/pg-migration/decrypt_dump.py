#!/usr/bin/env python3
"""
Расшифровывает дамп из export_dump.py и проверяет его SHA-256.

    python3 scripts/pg-migration/decrypt_dump.py --key-file data/migration/caesar.key DUMP.pgsql.caesar > dump.sql
    python3 scripts/pg-migration/decrypt_dump.py --key 113 DUMP.pgsql.caesar --out dump.sql

Сразу загрузить в PostgreSQL с параметрами из конфига create_pg_user.py:

    set -a; . data/migration/pg-connection.env; set +a
    python3 scripts/pg-migration/decrypt_dump.py --key-file data/migration/caesar.key DUMP.pgsql.caesar \\
      | psql -v ON_ERROR_STOP=1 -q
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import caesar  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dump")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--key", type=int)
    group.add_argument("--key-file")
    ap.add_argument("--out", help="файл для расшифрованного SQL (по умолчанию — stdout)")
    args = ap.parse_args()

    key = args.key if args.key is not None else int(open(args.key_file, encoding="utf-8").read().strip())
    with open(args.dump, "rb") as f:
        try:
            data = caesar.decrypt(f.read(), key)
        except ValueError as e:
            sys.exit(f"Ошибка: {e}")
    if args.out:
        fd = os.open(args.out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        print(f"Расшифровано: {args.out}", file=sys.stderr)
    else:
        sys.stdout.buffer.write(data)


if __name__ == "__main__":
    main()
