#!/usr/bin/env python3
"""
Мост между mdtask (Node/Express) и backend терминала (app.py).

mdtask запускает этот процесс один раз (src/lib/ib-bridge.js) и шлёт ему
запросы JSON-строками в stdin:

    {"id": 1, "path": "/api/run", "data": {"cmd": "ls"}, "sid": "..."}

а ответы читает JSON-строками из stdout:

    {"id": 1, "status": 200, "body": {...}, "sid": "..." | "" | null}

Вся логика — та же функция handle_api(), что и у автономного сервера app.py,
так что терминал внутри mdtask ведёт себя один в один. Сессии терминала живут
в памяти этого процесса (как и в app.py) и теряются при его перезапуске.
Каждый запрос выполняется в своём потоке — как в ThreadingHTTPServer.
"""

import json
import sys
import threading

import app

_write_lock = threading.Lock()


def reply(obj):
    line = json.dumps(obj, ensure_ascii=False)
    with _write_lock:
        sys.stdout.write(line + "\n")
        sys.stdout.flush()


def handle(raw):
    try:
        req = json.loads(raw)
    except json.JSONDecodeError:
        return
    req_id = req.get("id")
    try:
        status, body, new_sid = app.handle_api(req.get("path") or "", req.get("data") or {}, req.get("sid"))
        reply({"id": req_id, "status": status, "body": body, "sid": new_sid})
    except Exception as e:  # ошибка одной команды не должна ронять весь терминал
        reply({"id": req_id, "status": 500, "body": {"error": f"{type(e).__name__}: {e}"}, "sid": None})


def main():
    for raw in sys.stdin:
        if raw.strip():
            threading.Thread(target=handle, args=(raw,), daemon=True).start()


if __name__ == "__main__":
    main()
