DIR = 'm6/03-json-net'
THEORY = r'''
# Передача JSON по сети

Текстовый протокол «команда аргументы» быстро становится неудобным: как передать имя с пробелом, список, вложенные
данные? Решение — передавать **JSON**: и клиент, и сервер переводят словарь в строку и обратно.

```python run modules=socket
import json
import socket

request = {"op": "*", "a": 6, "b": 7}
with socket.socket() as sock:
    sock.connect(("10.0.0.5", 7002))
    sock.sendall(json.dumps(request).encode("utf-8"))
    answer = json.loads(sock.recv(1024).decode("utf-8"))
print(answer)
```

Цепочка: словарь → `json.dumps` → строка → `.encode()` → байты → **сеть** → байты → `.decode()` → строка →
`json.loads` → словарь.

## Калькулятор на порту 7002

Запрос: `{"op": "+" | "-" | "*" | "/", "a": число, "b": число}`. Ответ: `{"result": число}` или
`{"error": "…"}` (деление на ноль, неизвестная операция, неверный запрос).

## Надёжный сервер

Клиент может прислать что угодно, поэтому сервер:

1. ловит `json.JSONDecodeError` — пришёл не JSON;
2. проверяет, что это словарь и в нём есть нужные поля нужных типов (`isinstance(x, (int, float))`);
3. на любую ошибку отвечает понятным JSON с полем `error`, а не падает.

## Границы сообщений

В настоящей сети TCP передаёт **поток байт**: два быстрых `send` могут прийти одним `recv`, а длинное сообщение —
частями. Поэтому настоящие протоколы отделяют сообщения, например переводом строки (`"\n"`), или передают перед
сообщением его длину. В учебной сети одно отправленное сообщение — это ровно один `recv`, чтобы сосредоточиться на
главном.
'''
CL = lambda *cs: {'_edunet.json': '{"clients": ' + __import__('json').dumps([list(c) for c in cs], ensure_ascii=False) + '}\n'}
TASKS = [
    {'id': 'jn-01', 'title': 'Клиент калькулятора', 'statement': 'Даны выражения «a op b» по одному до «конец» (a и b — числа, op — + - * /). Отправляйте каждое на калькулятор (порт 7002) JSON-запросом {"op", "a", "b"} (числа — float) и выводите «выражение = результат» или «выражение: ошибка — <текст>».',
     'solution': 'import json\nimport socket\n\nwith socket.socket() as s:\n    s.connect(("192.168.1.10", 7002))\n    while True:\n        line = input()\n        if line == "конец":\n            break\n        a, op, b = line.split()\n        s.sendall(json.dumps({"op": op, "a": float(a), "b": float(b)}).encode("utf-8"))\n        reply = json.loads(s.recv(1024).decode("utf-8"))\n        if "result" in reply:\n            print(f"{line} = {reply[\'result\']}")\n        else:\n            print(f"{line}: ошибка — {reply[\'error\']}")', 'inputs': [['2 + 3', '7 / 2', '1 / 0', '5 % 2', 'конец']], 'modules': ['socket'], 'require': ['import:socket', 'import:json']},
    {'id': 'jn-02', 'title': 'Сервер приёма результатов', 'statement': 'Клиенты присылают JSON {"name": имя, "score": очки}. Сервер хранит лучший результат каждого имени (общий для всех клиентов) и отвечает JSON {"ok": true, "best": лучший результат этого имени, "players": число разных имён}. Ответ — json.dumps(…, ensure_ascii=False).',
     'solution': 'import json\nimport socket\n\nbest = {}\nserver = socket.socket()\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        msg = json.loads(data.decode("utf-8"))\n        name, score = msg["name"], msg["score"]\n        if name not in best or score > best[name]:\n            best[name] = score\n        conn.sendall(json.dumps({"ok": True, "best": best[name], "players": len(best)}, ensure_ascii=False).encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['{"name": "Али", "score": 10}', '{"name": "Али", "score": 7}'], ['{"name": "Бек", "score": 15}', '{"name": "Али", "score": 12}'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:json']},
    {'id': 'jn-03', 'title': 'Защита от плохих запросов', 'statement': 'Как прошлый сервер, но с проверками: не JSON → {"error": "bad json"}; не словарь, нет поля name (строка) или score (целое число) → {"error": "bad request"}. Корректные запросы — как в прошлой задаче.',
     'solution': 'import json\nimport socket\n\nbest = {}\n\ndef handle(text):\n    try:\n        msg = json.loads(text)\n    except json.JSONDecodeError:\n        return {"error": "bad json"}\n    if not isinstance(msg, dict) or not isinstance(msg.get("name"), str) or not isinstance(msg.get("score"), int):\n        return {"error": "bad request"}\n    name, score = msg["name"], msg["score"]\n    if name not in best or score > best[name]:\n        best[name] = score\n    return {"ok": True, "best": best[name], "players": len(best)}\n\nserver = socket.socket()\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        conn.sendall(json.dumps(handle(data.decode("utf-8")), ensure_ascii=False).encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['{"name": "Ли", "score": 5}', 'привет', '[1, 2]', '{"name": "Ли"}', '{"name": "Ли", "score": "10"}', '{"name": "Ли", "score": 9}'])}], 'modules': ['socket'], 'require': ['import:socket', 'try']},
    {'id': 'jn-04', 'title': 'Свой JSON-калькулятор', 'statement': 'Напишите сервер с тем же протоколом, что калькулятор на порту 7002: {"op", "a", "b"} → {"result": …}; ошибки: деление на ноль → {"error": "деление на ноль"}, неизвестная операция → {"error": "неизвестная операция"}, всё остальное → {"error": "неверный запрос"}. Ответ — json.dumps(…, ensure_ascii=False).',
     'solution': 'import json\nimport socket\n\ndef calc(text):\n    try:\n        req = json.loads(text)\n        a, b, op = req["a"], req["b"], req["op"]\n        if op == "+":\n            return {"result": a + b}\n        if op == "-":\n            return {"result": a - b}\n        if op == "*":\n            return {"result": a * b}\n        if op == "/":\n            if b == 0:\n                return {"error": "деление на ноль"}\n            return {"result": a / b}\n        return {"error": "неизвестная операция"}\n    except (ValueError, KeyError, TypeError):\n        return {"error": "неверный запрос"}\n\nserver = socket.socket()\nserver.bind(("0.0.0.0", 9000))\nserver.listen()\nwhile True:\n    conn, addr = server.accept()\n    while True:\n        data = conn.recv(1024)\n        if not data:\n            break\n        conn.sendall(json.dumps(calc(data.decode("utf-8")), ensure_ascii=False).encode("utf-8"))\n    conn.close()', 'inputs': [{'files': CL(['{"op": "+", "a": 2, "b": 3}', '{"op": "/", "a": 1, "b": 0}', '{"op": "^", "a": 2, "b": 3}', '{"a": 1}', 'нет'], ['{"op": "/", "a": 7, "b": 2}'])}], 'modules': ['socket'], 'require': ['import:socket', 'import:json']},
    {'id': 'jn-05', 'title': 'Пакетный клиент', 'statement': 'Дано n и n строк «a op b». Отправьте все выражения калькулятору (порт 7002), посчитайте, сколько вычислено успешно, и выведите сумму всех успешных результатов (округлить до двух знаков), а затем список ошибок «№i: текст ошибки» (i — номер выражения с 1).',
     'solution': 'import json\nimport socket\n\nok_sum = 0\nok_count = 0\nerrors = []\nn = int(input())\nwith socket.socket() as s:\n    s.connect(("192.168.1.10", 7002))\n    for i in range(1, n + 1):\n        a, op, b = input().split()\n        s.sendall(json.dumps({"op": op, "a": float(a), "b": float(b)}).encode("utf-8"))\n        r = json.loads(s.recv(1024).decode("utf-8"))\n        if "result" in r:\n            ok_sum += r["result"]\n            ok_count += 1\n        else:\n            errors.append(f"№{i}: {r[\'error\']}")\nprint(f"Успешно: {ok_count}")\nprint(f"Сумма: {round(ok_sum, 2)}")\nfor e in errors:\n    print(e)', 'inputs': [['4', '1 + 2', '3 / 0', '2.5 * 4', '9 ? 1'], ['1', '5 - 7']], 'modules': ['socket'], 'require': ['import:socket', 'import:json']},
]
