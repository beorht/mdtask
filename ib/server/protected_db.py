"""
Защищённые паролем файлы SQLite для задания №3.

Настоящий SQLite не умеет шифровать базы без расширений (SQLCipher и т.п.),
поэтому формат свой, учебный: заголовок MAGIC + соль + содержимое базы,
зашифрованное XOR с потоком SHAKE-256 от ключа scrypt(пароль, соль).
Без пароля файл выглядит как случайные байты (cat покажет «двоичный файл»).

Используется и генератором (ctf/caesar-secret/generate_challenge.py),
и терминалом (sqlite_shell.py) — формат должен совпадать.
"""

import hashlib
import os

MAGIC = b"SECLABDB1\n"
SALT_LEN = 16
SQLITE_HEADER = b"SQLite format 3\x00"


def _keystream(password: str, salt: bytes, n: int) -> bytes:
    key = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=32)
    return hashlib.shake_256(key).digest(n)


def _xor(data: bytes, ks: bytes) -> bytes:
    n = len(data)
    return (int.from_bytes(data, "big") ^ int.from_bytes(ks, "big")).to_bytes(n, "big")


def encrypt(db_bytes: bytes, password: str) -> bytes:
    salt = os.urandom(SALT_LEN)
    return MAGIC + salt + _xor(db_bytes, _keystream(password, salt, len(db_bytes)))


def decrypt(blob: bytes, password: str):
    """Возвращает байты базы SQLite или None, если пароль неверный."""
    if not blob.startswith(MAGIC):
        return None
    salt = blob[len(MAGIC):len(MAGIC) + SALT_LEN]
    body = blob[len(MAGIC) + SALT_LEN:]
    data = _xor(body, _keystream(password, salt, len(body)))
    return data if data.startswith(SQLITE_HEADER) else None


def is_protected(path) -> bool:
    try:
        with open(path, "rb") as f:
            return f.read(len(MAGIC)) == MAGIC
    except OSError:
        return False
