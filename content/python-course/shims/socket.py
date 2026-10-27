"""
Учебная сеть курса «Начальный Python»: модуль socket с теми же функциями, что настоящий (socket, bind, listen, accept,
connect, send, sendall, recv, close), но вся сеть — внутри запуска программы, без интернета и одинаково каждый раз,
поэтому программу можно проверить тестами.

Клиент: на любом адресе учебной сети работают серверы на портах
  7000 — эхо: возвращает то же самое;
  7001 — верхний регистр: возвращает текст большими буквами;
  7002 — калькулятор JSON: {"op": "+|-|*|/", "a": …, "b": …} → {"result": …} или {"error": …};
  7003 — телефонный справочник: «ADD имя телефон» → «OK», «GET имя» → телефон или «NOT FOUND», «LIST» → имена через запятую;
  7004 — чат: «SEND автор текст» → «OK», «HISTORY» → история сообщений построчно (или «EMPTY»).
Другие порты — ConnectionRefusedError.

Сервер: accept() по очереди отдаёт подключения учебных клиентов из файла _edunet.json рядом с программой
({"clients": [["сообщение 1", "сообщение 2"], …]} — каждый клиент отправляет свои сообщения по одному на recv; потом
закрывает соединение и recv возвращает b""). Всё, что сервер отправит клиенту, выводится строкой
«[клиент N получил] …». Когда клиентов больше нет, accept() завершает программу.
"""

import json as _json
import sys as _sys

AF_INET = 2
SOCK_STREAM = 1
SOL_SOCKET = 1
SO_REUSEADDR = 2
timeout = OSError


def gethostname():
    return 'student-pc'


def gethostbyname(name):
    return '127.0.0.1' if name in ('localhost', 'student-pc') else '192.168.1.10'


def _text(data):
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("a bytes-like object is required, not '" + type(data).__name__ + "' — используйте .encode()")
    return bytes(data).decode('utf-8')


_phonebook = {}
_chat = []


def _calc(message):
    try:
        req = _json.loads(message)
        a, b, op = req['a'], req['b'], req['op']
        if op == '+':
            res = a + b
        elif op == '-':
            res = a - b
        elif op == '*':
            res = a * b
        elif op == '/':
            if b == 0:
                return _json.dumps({'error': 'деление на ноль'}, ensure_ascii=False)
            res = a / b
        else:
            return _json.dumps({'error': 'неизвестная операция'}, ensure_ascii=False)
        return _json.dumps({'result': res})
    except (ValueError, KeyError, TypeError):
        return _json.dumps({'error': 'неверный запрос'}, ensure_ascii=False)


def _phone(message):
    parts = message.split()
    if len(parts) == 3 and parts[0] == 'ADD':
        _phonebook[parts[1]] = parts[2]
        return 'OK'
    if len(parts) == 2 and parts[0] == 'GET':
        return _phonebook.get(parts[1], 'NOT FOUND')
    if parts == ['LIST']:
        return ','.join(sorted(_phonebook)) or 'EMPTY'
    return 'ERROR'


def _chat_reply(message):
    if message.startswith('SEND '):
        parts = message.split(' ', 2)
        if len(parts) == 3:
            _chat.append(f'{parts[1]}: {parts[2]}')
            return 'OK'
    if message == 'HISTORY':
        return '\n'.join(_chat) or 'EMPTY'
    return 'ERROR'


SERVICES = {7000: lambda m: m, 7001: lambda m: m.upper(), 7002: _calc, 7003: _phone, 7004: _chat_reply}


def _clients():
    try:
        with open('_edunet.json', encoding='utf-8') as f:
            return [list(c) for c in _json.load(f).get('clients', [])]
    except FileNotFoundError:
        return []


class socket:  # noqa: N801 — имя как в стандартном модуле
    def __init__(self, family=AF_INET, type=SOCK_STREAM, *args):  # noqa: A002
        self._service = None
        self._replies = []
        self._client = None
        self._incoming = None
        self._bound = None
        self._listening = False
        self._queue = None
        self._closed = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def setsockopt(self, *args):
        pass

    def settimeout(self, value):
        pass

    def bind(self, address):
        self._bound = tuple(address)

    def listen(self, backlog=5):
        if self._bound is None:
            raise OSError('сначала bind((адрес, порт))')
        self._listening = True
        self._queue = _clients()

    def accept(self):
        if not self._listening:
            raise OSError('сначала listen()')
        if not self._queue:
            print('[учебная сеть] клиентов больше нет — сервер остановлен')
            _sys.exit(0)
        number = len(_clients()) - len(self._queue) + 1
        conn = socket()
        conn._client = number
        conn._incoming = list(self._queue.pop(0))
        return conn, (f'192.168.1.{100 + number}', 50000 + number)

    def connect(self, address):
        host, port = address
        if port not in SERVICES:
            raise ConnectionRefusedError(f'[Errno 111] Connection refused: {host}:{port}')
        self._service = SERVICES[port]

    def sendall(self, data):
        self.send(data)

    def send(self, data):
        text = _text(data)
        if self._closed:
            raise OSError('сокет закрыт')
        if self._client is not None:
            print(f'[клиент {self._client} получил] {text}')
        elif self._service is not None:
            self._replies.append(self._service(text))
        else:
            raise OSError('сокет не подключён: сначала connect((адрес, порт))')
        return len(data)

    def recv(self, bufsize=1024):
        if self._client is not None:
            return self._incoming.pop(0).encode('utf-8') if self._incoming else b''
        if self._service is not None:
            return self._replies.pop(0).encode('utf-8') if self._replies else b''
        raise OSError('сокет не подключён')

    def close(self):
        self._closed = True


error = OSError
