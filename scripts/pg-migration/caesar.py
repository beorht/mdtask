"""
Шифр Цезаря для файла дампа: каждый байт сдвигается на ключ (1–255) по модулю 256.

Это НЕ настоящая защита: ключ подбирается перебором из 255 вариантов за доли секунды.
Шифр только прячет содержимое от случайного взгляда; передавайте файл и ключ раздельно
и не выкладывайте их в открытый доступ.

Формат файла: первая строка — открытый заголовок
    MDTASK-CAESAR v1 sha256=<SHA-256 расшифрованного содержимого>
затем зашифрованные байты. По SHA-256 расшифровка проверяет, что ключ верный.
"""

import hashlib

MAGIC = b"MDTASK-CAESAR v1"


def check_key(key):
    if not isinstance(key, int) or not 1 <= key <= 255:
        raise ValueError("ключ шифра — целое число от 1 до 255")
    return key


def _table(shift):
    return bytes((b + shift) % 256 for b in range(256))


def encrypt(data, key):
    check_key(key)
    header = MAGIC + b" sha256=" + hashlib.sha256(data).hexdigest().encode() + b"\n"
    return header + data.translate(_table(key))


def decrypt(blob, key):
    check_key(key)
    header, sep, body = blob.partition(b"\n")
    if not sep or not header.startswith(MAGIC + b" sha256="):
        raise ValueError("это не файл MDTASK-CAESAR v1")
    expected = header.split(b"sha256=", 1)[1].decode()
    data = body.translate(_table(256 - key))
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("неверный ключ или файл повреждён (SHA-256 не совпадает)")
    return data
