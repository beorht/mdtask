DIR = 'm6/01-echo'
THEORY = r'''
# Первая сетевая программа: эхо-сервер

Программы общаются по сети через **сокеты**. Сокет — «розетка» на конце соединения: в неё можно отправлять байты и
из неё их получать. Почти всё в интернете — браузер, мессенджер, игра — внутри работает на сокетах.

## Клиент и сервер

- **Сервер** занимает адрес и **порт** (номер «двери» на компьютере, 0–65535), ждёт подключений и отвечает.
- **Клиент** знает адрес и порт сервера, **подключается** и отправляет запросы.

Адрес вида `("192.168.1.10", 7000)` — компьютер в сети и порт на нём. `"127.0.0.1"` (или `"localhost"`) — свой же
компьютер.

## Учебная сеть

В браузере настоящих сокетов нет, а в классе нет интернета, поэтому на сайте работает **учебная сеть**: модуль
`socket` с теми же функциями, что у настоящего. Код из этих уроков без изменений работает и с настоящим `socket` на
вашем компьютере.

В учебной сети на любом адресе работают серверы:

| Порт | Сервер |
| --- | --- |
| 7000 | эхо: возвращает то, что получил |
| 7001 | возвращает текст большими буквами |
| 7002 | калькулятор JSON (урок 6.3) |
| 7003 | телефонный справочник (урок 6.5) |
| 7004 | чат (урок 6.6) |

## Клиент

```python run modules=socket
import socket

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect(("192.168.1.10", 7000))
client.sendall("Привет, сервер!".encode("utf-8"))
reply = client.recv(1024).decode("utf-8")
print("ответ:", reply)
client.close()
```

- `AF_INET` — адреса IPv4, `SOCK_STREAM` — надёжное соединение TCP (данные приходят полностью и по порядку);
- по сети передаются **байты**: строку кодируют `.encode("utf-8")`, ответ раскодируют `.decode("utf-8")`;
- `recv(1024)` — получить до 1024 байт.

## Сервер

```text
сокет ← socket(AF_INET, SOCK_STREAM)
bind((адрес, порт))     занять адрес и порт ("0.0.0.0" — на всех сетевых картах)
listen()                начать ждать подключения
повторять:
    conn, addr ← accept()    дождаться клиента: conn — сокет для общения с ним
    повторять:
        данные ← conn.recv(1024)
        если данных нет (b""): клиент отключился, выйти
        conn.sendall(ответ)
    conn.close()
```

Серверу в учебной сети подключаются **учебные клиенты** из файла `_edunet.json` (он виден в примерах задачи): каждый
клиент отправляет свои сообщения по одному на каждый `recv`, а всё, что сервер отправит клиенту, появляется в выводе
строкой «[клиент N получил] …». Когда клиентов больше нет, `accept()` останавливает программу.

Сокет удобно открывать через `with socket.socket(...) as s:` — он закроется сам.
'''
CL = lambda *cs: {'_edunet.json': '{"clients": ' + __import__('json').dumps([list(c) for c in cs], ensure_ascii=False) + '}\n'}
TASKS = [
    {'id': 'echo-01', 'title': 'Эхо-клиент', 'statement': 'Подключитесь к эхо-серверу ("192.168.1.10", 7000). Даны сообщения по одному до «конец»: отправьте каждое и выведите ответ сервера в виде «-> сообщение» и «<- ответ».',
     'solution': 'import socket\n\nwith socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:\n    s.connect(("192.168.1.10", 7000))\n    while True:\n        msg = input()\n        if msg == "конец":\n            break\n        s.sendall(msg.encode("utf-8"))\n        print(f"-> {msg}")\n        print(f"<- {s.recv(1024).decode(\'utf-8\')}")', 'inputs': [['Привет', 'Как дела?', 'конец'], ['конец']], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'echo-02', 'title': 'Громкий сервер', 'statement': 'Сервер на порту 7001 возвращает текст большими буквами. Дана строка слов — отправьте каждое слово отдельно и выведите ответы через пробел в одну строку, а во второй — общее число полученных байт.',
     'solution': 'import socket\n\nwith socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:\n    s.connect(("192.168.1.10", 7001))\n    replies = []\n    total = 0\n    for word in input().split():\n        s.sendall(word.encode("utf-8"))\n        data = s.recv(1024)\n        total += len(data)\n        replies.append(data.decode("utf-8"))\nprint(" ".join(replies))\nprint(total)', 'inputs': [['мир труд май'], ['python socket']], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'echo-03', 'title': 'Эхо-сервер', 'statement': 'Напишите эхо-сервер: bind на ("0.0.0.0", 9000), listen, в цикле accept; для каждого клиента — получать сообщения и отправлять их обратно, пока клиент не отключится (recv вернёт b""). Сам сервер ничего не печатает — ответы клиентам видны в выводе учебной сети.',
     'solution': 'import socket\n\nserver = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        conn.sendall(data)\n    conn.close()', 'inputs': [{'files': CL(['привет', 'эхо?'], ['один'])}, {'files': CL()}, {'files': CL(['a'], ['b'], ['c', 'd', 'e'])}], 'modules': ['socket'], 'require': ['import:socket', 'while']},
    {'id': 'echo-04', 'title': 'Сервер с журналом', 'statement': 'Как эхо-сервер, но сервер печатает «Подключился <ip>:<порт>» при подключении и «Отключился, сообщений: k» после отключения клиента; клиенту отвечает «#k: сообщение», где k — номер сообщения этого клиента.',
     'solution': 'import socket\n\nserver = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, (ip, port) = server.accept()\n    print(f"Подключился {ip}:{port}")\n    k = 0\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        k += 1\n        conn.sendall(f"#{k}: {data.decode(\'utf-8\')}".encode("utf-8"))\n    print(f"Отключился, сообщений: {k}")\n    conn.close()', 'inputs': [{'files': CL(['привет', 'как дела'], [])}, {'files': CL(['x', 'y', 'z'])}], 'modules': ['socket'], 'require': ['import:socket']},
    {'id': 'echo-05', 'title': 'Вежливое прощание', 'statement': 'Сервер отвечает «Echo: СООБЩЕНИЕ» (большими буквами). Если клиент прислал «bye» (в любом регистре), сервер отвечает «Пока!» и сам закрывает соединение, не читая остальные сообщения этого клиента. Сам сервер ничего не печатает.',
     'solution': 'import socket\n\nserver = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        text = data.decode("utf-8")\n        if text.lower() == "bye":\n            conn.sendall("Пока!".encode("utf-8"))\n            break\n        conn.sendall(f"Echo: {text.upper()}".encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['hi', 'BYE', 'ещё'], ['test'])}, {'files': CL(['Bye'])}], 'modules': ['socket'], 'require': ['import:socket']},
]
