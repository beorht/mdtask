DIR = 'm6/02-lan'
THEORY = r'''
# Связь двух программ по сети

## Адреса в локальной сети

Компьютеры в одной сети (класс, Wi-Fi дома) получают **IP-адреса** вида `192.168.1.25`. Чтобы программа на одном
компьютере связалась с программой на другом, клиенту нужен IP сервера и порт.

| Адрес | Что значит |
| --- | --- |
| `127.0.0.1`, `localhost` | этот же компьютер |
| `192.168.x.x`, `10.x.x.x` | адреса внутри локальной сети |
| `0.0.0.0` (у сервера) | принимать подключения на всех сетевых картах |

`socket.gethostname()` — имя своего компьютера, `socket.gethostbyname(имя)` — его адрес.

## Если сервер не отвечает

Подключение к порту, где никто не слушает, заканчивается `ConnectionRefusedError`. Клиент должен это обрабатывать:

```python run modules=socket
import socket

for port in (7000, 8080):
    s = socket.socket()
    try:
        s.connect(("192.168.1.10", port))
        print(port, "открыт")
    except ConnectionRefusedError:
        print(port, "закрыт")
    finally:
        s.close()
```

`socket.socket()` без аргументов — то же, что `socket.socket(AF_INET, SOCK_STREAM)`.

## Протокол

Чтобы две программы понимали друг друга, они договариваются о **протоколе** — формате сообщений. Простой текстовый
протокол: команда и аргументы через пробел, ответ — строка:

```text
PING          → PONG
ADD 2 3       → 5
что-то другое → ERROR
```

Сервер, получив сообщение, разбирает его (`split()`), выполняет команду и отправляет ответ. Хороший протокол
предусматривает ответ на **неизвестную** команду — сервер не должен падать от неожиданного ввода.

## Один сервер — много клиентов

Сервер обслуживает клиентов по очереди: `accept()` в цикле. Данные, которые должны быть общими для всех клиентов
(счётчик, список), хранят **вне** цикла по клиентам.

## Как попробовать по-настоящему

На двух компьютерах класса с Python: на одном запустите сервер с `bind(("0.0.0.0", 9000))`, на другом — клиент с
IP первого компьютера. Брандмауэр может блокировать порт — тогда его нужно разрешить.
'''
CL = lambda *cs: {'_edunet.json': '{"clients": ' + __import__('json').dumps([list(c) for c in cs], ensure_ascii=False) + '}\n'}
TASKS = [
    {'id': 'lan-01', 'title': 'Сканер портов', 'statement': 'Дан адрес и номера портов через пробел. Попробуйте подключиться к каждому и выведите «порт: открыт» или «порт: закрыт» (ConnectionRefusedError), затем «Открытых: k».',
     'solution': 'import socket\n\nhost = input()\nopened = 0\nfor port in map(int, input().split()):\n    s = socket.socket()\n    try:\n        s.connect((host, port))\n        print(f"{port}: открыт")\n        opened += 1\n    except ConnectionRefusedError:\n        print(f"{port}: закрыт")\n    finally:\n        s.close()\nprint(f"Открытых: {opened}")', 'inputs': [['192.168.1.10', '22 7000 7001 8080 7004'], ['127.0.0.1', '80']], 'modules': ['socket'], 'require': ['import:socket', 'try']},
    {'id': 'lan-02', 'title': 'Мой компьютер', 'statement': 'Выведите «Имя: <gethostname()>» и «Адрес: <gethostbyname(имя)>». Затем подключитесь к эхо-серверу на своём адресе (порт 7000), отправьте строку «Я — <имя>» и выведите ответ.',
     'solution': 'import socket\n\nname = socket.gethostname()\nip = socket.gethostbyname(name)\nprint(f"Имя: {name}")\nprint(f"Адрес: {ip}")\nwith socket.socket() as s:\n    s.connect((ip, 7000))\n    s.sendall(f"Я — {name}".encode("utf-8"))\n    print(s.recv(1024).decode("utf-8"))', 'inputs': [[]], 'open': 1, 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'lan-03', 'title': 'PING и ADD', 'statement': 'Напишите сервер с протоколом: «PING» → «PONG», «ADD a b» → сумма, «MUL a b» → произведение (целые), всё остальное → «ERROR». Неверные числа — тоже «ERROR».',
     'solution': 'import socket\n\ndef handle(msg):\n    parts = msg.split()\n    if parts == ["PING"]:\n        return "PONG"\n    if len(parts) == 3 and parts[0] in ("ADD", "MUL"):\n        try:\n            a, b = int(parts[1]), int(parts[2])\n        except ValueError:\n            return "ERROR"\n        return str(a + b if parts[0] == "ADD" else a * b)\n    return "ERROR"\n\nserver = socket.socket()\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        conn.sendall(handle(data.decode("utf-8")).encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['PING', 'ADD 2 3', 'MUL 4 -5', 'ADD x 1', 'HELLO'], ['ping', 'PING'])}], 'modules': ['socket'], 'require': ['import:socket', 'def']},
    {'id': 'lan-04', 'title': 'Общий счётчик', 'statement': 'Сервер ведёт общий для всех клиентов счётчик сообщений. На каждое сообщение отвечает «Сообщение №k от вас №m», где k — номер сообщения среди всех клиентов, m — среди сообщений этого клиента.',
     'solution': 'import socket\n\nserver = socket.socket()\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\ntotal = 0\nwhile True:\n    conn, addr = server.accept()\n    mine = 0\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        total += 1\n        mine += 1\n        conn.sendall(f"Сообщение №{total} от вас №{mine}".encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['a', 'b'], ['c'], ['d', 'e'])}], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'lan-05', 'title': 'Викторина', 'statement': 'Сервер задаёт вопросы: сначала, сразу после подключения, отправляет клиенту первый вопрос «2+2?», а на каждый ответ отвечает «Верно!» или «Неверно, ответ: X» и затем следующий вопрос; вопросы: 2+2? (4), Столица Узбекистана? (Ташкент), 7*8? (56). После ответа на последний вопрос отправляет «Счёт: k/3» и закрывает соединение. Если клиент отключился раньше — переходит к следующему.',
     'solution': 'import socket\n\nQUESTIONS = [("2+2?", "4"), ("Столица Узбекистана?", "Ташкент"), ("7*8?", "56")]\nserver = socket.socket()\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    score = 0\n    for i, (q, a) in enumerate(QUESTIONS):\n        conn.sendall(q.encode("utf-8"))\n        data = conn.recv(1024)\n        if not data:\n            break\n        if data.decode("utf-8").strip() == a:\n            score += 1\n            conn.sendall("Верно!".encode("utf-8"))\n        else:\n            conn.sendall(f"Неверно, ответ: {a}".encode("utf-8"))\n    else:\n        conn.sendall(f"Счёт: {score}/3".encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['4', 'Самарканд', '56'], ['5'])}], 'modules': ['socket'], 'require': ['import:socket']},
]
