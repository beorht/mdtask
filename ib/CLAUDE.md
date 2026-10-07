# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

IBEmulator is a browser-based terminal emulator for practical labs in an Information Security course: a web terminal backed by real student data, lab tasks, and automated checkers. All user-facing text (UI strings, command output, task files, docs, comments) is in Russian — keep it that way.

There are no dependencies, no build step, no test suite and no linter. Backend is pure Python 3 stdlib; frontend is plain HTML/CSS/JS in single files.

## Commands

```bash
# Run the terminal backend (http://localhost:8088, terminal at /prototype/terminal-lab.html, admin at /admin-panel/index.html)
python3 server/app.py
MDTASK_DB=/path/to/mdtask.db CTF_CAESAR_DIR=/path/to/sandboxes PORT=8088 python3 server/app.py

# Generate task №3 (Caesar) secrets + sandboxes for a student group
python3 ctf/caesar-secret/generate_challenge.py --group IB [--db ...] [--out ...] [--force]

# Run checkers
checks/task1_check.sh <student_id> <host> <user> <identity_file> [port]
checks/task2_check.sh <student_id> <container_name>
checks/run_all.py checks/students.example.json > checks/reports/report.json
```

## Architecture

**Part of mdtask.** IBEmulator now lives inside mdtask as `ib/` (the "Информационная безопасность" subject). It reads and writes mdtask's SQLite DB (default `<mdtask>/data/mdtask.db`, computed from the file location) and reads student sandboxes from `<mdtask>/data/ctf/caesar/<student_id>/`. Inside mdtask, `server/bridge.py` runs `handle_api()` from `app.py` for Node (`src/lib/ib-bridge.js`, JSON lines over stdin/stdout); `src/routes/ib.js` serves `prototype/terminal-lab.html` with `window.SECLAB_API` set and forwards `/ib/<task>/api/*`, allowing the TTY login only for the logged-in mdtask student. The standalone `app.py` server still works the same way. The `users` table belongs to mdtask; IBEmulator only adds `ctf_caesar_secrets` (schema in `ctf/caesar-secret/schema.sql`, also created inline by the generator). Running the generator or unlocking the task DB (which sets `solved`) mutates that real DB.

**Terminal flow (`prototype/terminal-lab.html` ↔ `server/app.py`).**
- `POST /api/login` checks the primary password first (`users.password_hash/password_salt`, scrypt n=16384 r=8 p=1 dklen=64, with the salt used as raw UTF-8 bytes — must stay byte-compatible with mdtask's `src/lib/password.js`). The task №3 password is *not* accepted for login.
- `POST /api/run {cmd}` goes through `run_line()`. If the session has an open sqlite3 shell, the line is fed to it; otherwise `run_command()` interprets it, a hand-written interpreter for a fixed command set (no subprocesses). Output `__CLEAR__` is a sentinel that the handler turns into `{clear: true}`. Responses carry `nextPrompt` (full prompt text) and `mode` (`shell`/`sqlite`); the frontend renders the prompt as given and only intercepts `logout`/`exit` in `shell` mode. `{interrupt: true}` (Ctrl+C) clears a pending multi-line SQL statement.
- Sessions live in the in-process `SESSIONS` dict (cookie `sid`) and are lost on restart; each session tracks `cwd` relative to the sandbox root and an optional `SqliteShell`.
- `server/sqlite_shell.py` is a simplified emulation of the `sqlite3` CLI. It's an emulator, so it covers the common cases rather than aiming for full CLI parity. SQL runs on the real SQLite engine; dot-commands and output modes (box/table/markdown/...) are implemented by hand. Sandbox safety relies on: DB paths resolved via `db_path_resolver()` in `app.py`, an authorizer that denies ATTACH/DETACH (this also blocks `VACUUM INTO`) and some PRAGMAs, `max_page_count`, and a progress-handler timeout.
- Task №3 goal: open the password-protected DB `~/Documents/backup/company_data.db`. `server/protected_db.py` defines its educational encryption format (MAGIC header + salt, XOR with a SHAKE-256 stream keyed by scrypt). The generator imports the same module via `sys.path` so the format stays shared. `sqlite3 <protected file>` returns a `PasswordPrompt` state (mode `password`: the frontend masks input and skips history, and the server blanks `cmd` in the response). A correct password deserializes the DB into memory (changes are not persisted) and calls `mark_solved()`. `.open` refuses protected files.
- Every path argument must go through `resolve_in_sandbox()`, which confines access to the student's sandbox (path-traversal protection). `pwd` shows a fake `/home/<id>/...`.

**Task №3 generator (`ctf/caesar-secret/generate_challenge.py`).** Per student: random password (word + 3 digits), Caesar shift 2–25, and a hidden file path drawn without repetition from `HIDDEN_NAME_POOL` (built from `HIDDEN_DIRS`, 100+ paths; paths already held by students not being regenerated are excluded). Every *other* pool path gets a plausible decoy, plus a standard Linux home skeleton and the demo DB `Documents/inventory.db`, so the real file isn't identifiable by name. `.bash_history` is always rewritten with a hint naming the hidden file's *directory* (not the file), seeded deterministically from student and path. Otherwise generation is idempotent: existing DB rows are skipped and existing files on disk are never overwritten; `--force` regenerates and rewrites the old hidden file back to a decoy. `--variant path` is the harder variant: the hidden file holds the Caesar-encrypted *path* to a second pool file containing the plaintext password (`variant`/`password_file_path` columns, added to old DBs via `ensure_columns()`); it uses two unique pool paths per student. Login still only compares `plain_password`, so the server is variant-agnostic. Never remove the original 24 paths from `HIDDEN_DIRS`, because existing students' real files live there. Each directory should keep several files so the history hint doesn't give away the file.

The command help lives only in `HELP_TEXT` in `server/app.py`; the README command list documents it too.

**Checkers (`checks/`).** Each `taskN_check.sh` sources `lib/common.sh`, records stages with `add_stage <id> <title> pass|fail <detail>`, and finishes with `print_report`, which prints a single JSON object `{task, student, total_stages, passed_stages, stages[]}` to stdout. Failing early still calls `print_report` and exits 0. `run_all.py` calls each script (30s timeout), parses that JSON, and builds the aggregate report. To add a task, create `taskN_check.sh` and add an entry to `TASKS` in `run_all.py` (`args` lambda + `requires` key in `students.json`).

**Admin panel (`admin-panel/index.html`)** currently renders embedded demo data in the `run_all.py` report shape. It is not yet wired to real reports. Real task №3 results are shown in mdtask's own admin at `/admin/ib`.

**`TASK.md`** (repo root) is the short task №3 statement and the only task file in a sandbox. The generator copies its student part into every sandbox as `~/TASK.md`, cutting everything from the `## Для преподавателя` heading on (that section holds the answer query, so keep that exact heading). It also deletes the obsolete `ЗАДАНИЕ.txt`/`help.txt` left by older versions. Re-run the generator after editing it.

**Tasks (`task/№<n>.<Name>.md`)** are step-by-step instructor/infra guides. `docs/practical-modules-plan.md` is the overall course plan.
