// Client for the information-security terminal backend (ib/server, Python stdlib).
// The terminal (bash/sqlite3 emulation, task sandboxes, the protected DB) is IBEmulator's
// code as-is; mdtask runs it as one long-lived child process (ib/server/bridge.py) and talks
// to it over JSON lines on stdin/stdout. The process is spawned lazily on first use and
// respawned if it dies; terminal sessions live in it and are lost on restart (the page then
// gets a 401 and shows the TTY login again, as in the standalone IBEmulator).
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const BRIDGE_SCRIPT = path.join(__dirname, '..', '..', 'ib', 'server', 'bridge.py');
const PYTHON = process.env.IB_PYTHON || 'python3';
const REQUEST_TIMEOUT_MS = 30000;

// Same DB as src/db/index.js, resolved against the same cwd.
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db'));
const CTF_CAESAR_DIR = path.resolve(
  process.env.CTF_CAESAR_DIR || path.join(__dirname, '..', '..', 'data', 'ctf', 'caesar')
);

let child = null;
let nextId = 1;
const pending = new Map();

function failAll(message) {
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(new Error(message));
  }
  pending.clear();
}

function ensureChild() {
  if (child) return child;
  child = spawn(PYTHON, [BRIDGE_SCRIPT], {
    env: { ...process.env, MDTASK_DB: DB_PATH, CTF_CAESAR_DIR, PYTHONDONTWRITEBYTECODE: '1' },
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const proc = child;
  readline.createInterface({ input: proc.stdout }).on('line', (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      return;
    }
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    clearTimeout(entry.timer);
    entry.resolve(msg);
  });
  const onGone = (reason) => {
    if (child !== proc) return;
    child = null;
    failAll(reason);
  };
  proc.on('exit', (code) => onGone(`терминал завершился (код ${code})`));
  proc.on('error', (err) => onGone(`не удалось запустить терминал: ${err.message}`));
  proc.stdin.on('error', () => {});
  return proc;
}

// Calls handle_api(apiPath, data, sid) in ib/server/app.py.
// Resolves to { status, body, sid } — sid: new session id, '' to forget it, null if unchanged.
function callTerminal(apiPath, data, sid) {
  const proc = ensureChild();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('терминал не ответил вовремя'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    proc.stdin.write(JSON.stringify({ id, path: apiPath, data: data || {}, sid: sid || null }) + '\n');
  });
}

function stopTerminal() {
  if (child) child.kill();
}

module.exports = { callTerminal, stopTerminal };
