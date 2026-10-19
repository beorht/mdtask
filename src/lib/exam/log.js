// Action log of the IB final exam: every action of a student is one JSON line in the student's
// own file, data/exam/<exam>/logs/<student>.jsonl (append only, never rewritten), so logs of
// different students never mix and a student's whole session can be replayed afterwards.
// `seq` numbers a student's events without gaps; code at every run/check/save is kept in full
// under data/exam/<exam>/snapshots/<student>/. A short copy of each event goes to exam_events
// for the admin tables. Node runs one request at a time, so appendFileSync keeps lines whole.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { insertExamEvent } = require('../../db');

const EXAM_DIR = path.resolve(process.env.EXAM_DIR || path.join(__dirname, '..', '..', '..', 'data', 'exam'));
const SAFE_ID = /^[A-Za-z0-9._-]+$/;
const MAX_STRING = 4000;
const MAX_DATA = 20000;
const SUMMARY_LEN = 300;

const seqs = new Map();

function examDir(examId) {
  if (!SAFE_ID.test(examId)) throw new Error(`bad exam id: ${examId}`);
  return path.join(EXAM_DIR, examId);
}

function logFile(examId, studentId) {
  if (!SAFE_ID.test(studentId)) throw new Error(`bad student id: ${studentId}`);
  return path.join(examDir(examId), 'logs', `${studentId}.jsonl`);
}

// The last seq written to the file (read from its tail), so numbering continues after a restart.
function lastSeqInFile(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
  } catch (err) {
    return 0;
  }
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, 65536);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString('utf-8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(lines[i]).seq || 0;
      } catch (err) {
        // a partial first line of the tail
      }
    }
    return 0;
  } finally {
    fs.closeSync(fd);
  }
}

function clip(value, depth = 0) {
  if (typeof value === 'string') return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + '…' : value;
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => clip(v, depth + 1));
  if (value && typeof value === 'object' && depth < 4) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = clip(v, depth + 1);
    return out;
  }
  return value;
}

function sessionTag(req) {
  if (!req || !req.sessionID) return null;
  return crypto.createHash('sha256').update(req.sessionID).digest('hex').slice(0, 8);
}

// type: what happened; stage/task: where; data: details (strings are clipped).
function logEvent(examId, studentId, { type, stage = null, task = null, data = {}, req = null, clientTs = null }) {
  const file = logFile(examId, studentId);
  const key = `${examId}/${studentId}`;
  if (!seqs.has(key)) seqs.set(key, lastSeqInFile(file));
  const seq = seqs.get(key) + 1;
  seqs.set(key, seq);
  let payload = clip(data || {});
  if (JSON.stringify(payload).length > MAX_DATA) payload = { truncated: true };
  const event = {
    ts: new Date().toISOString(),
    seq,
    student: studentId,
    exam: examId,
    stage,
    task,
    type,
    data: payload,
    session: sessionTag(req),
    ip: req ? req.ip : null,
  };
  if (clientTs) event.clientTs = clientTs;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(event) + '\n');
  insertExamEvent(examId, studentId, seq, event.ts, stage, task, type, JSON.stringify(payload).slice(0, SUMMARY_LEN));
  return event;
}

// Full code at a run, check or save; the event refers to it by file name.
function saveSnapshot(examId, studentId, seq, taskId, kind, code) {
  const name = `${String(seq).padStart(5, '0')}-${taskId}-${kind}.py`;
  const dir = path.join(examDir(examId), 'snapshots', studentId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), code);
  return name;
}

function readLog(examId, studentId) {
  let text;
  try {
    text = fs.readFileSync(logFile(examId, studentId), 'utf-8');
  } catch (err) {
    return [];
  }
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);
}

function readSnapshot(examId, studentId, name) {
  if (!/^\d{5}-[\d.]+-[a-z_]+\.py$/.test(name)) return null;
  try {
    return fs.readFileSync(path.join(examDir(examId), 'snapshots', studentId, name), 'utf-8');
  } catch (err) {
    return null;
  }
}

// Tests only: forget cached numbering.
function __resetLogForTests() {
  seqs.clear();
}

module.exports = { EXAM_DIR, examDir, logFile, logEvent, saveSnapshot, readLog, readSnapshot, __resetLogForTests };
