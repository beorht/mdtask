#!/usr/bin/env node
// Итоговая контрольная: перенос работы студентов с другого сервера (архив проекта) в эту базу.
// 20.10.2026 контрольная шла на двух серверах: часть студентов работала здесь, часть — на
// временном сервере, некоторые — на обоих. Скрипт сливает:
//   - exam_tasks: по каждому заданию берётся лучшая строка (решённая лучше нерешённой,
//     отправленная лучше неотправленной, при равенстве — более поздняя); попытки складываются;
//   - журналы data/exam/<id>/logs/<студент>.jsonl: события обоих серверов по времени, seq заново
//     1..N, у каждого события server (here | archive) и origSeq; снимки кода переименовываются
//     под новые seq; exam_events этих студентов строится заново из журнала;
//   - песочницы терминала: берётся та, где студент работал позже (другая — в резервную копию).
// Остальные таблицы не трогаются (в архиве они совпадают с этой базой или старше).
//
//   node scripts/exam/merge-archive.js --archive-db A.db --archive-dir <архив>/data/exam      — только отчёт
//   ... --apply   — выполнить (сервер должен быть остановлен; копии базы и журналов — в backups/)
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const APPLY = args.includes('--apply');
const EXAM = opt('exam') || 'ib-final-1';
const ROOT = path.join(__dirname, '..', '..');
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(ROOT, 'data', 'mdtask.db'));
const HERE_DIR = path.join(path.resolve(process.env.EXAM_DIR || path.join(ROOT, 'data', 'exam')), EXAM);
const ARCH_DIR = path.join(path.resolve(opt('archive-dir') || ''), EXAM);
const ARCH_DB = opt('archive-db');
if (!ARCH_DB || !opt('archive-dir')) {
  console.error('Нужны --archive-db и --archive-dir');
  process.exit(1);
}
const STAMP = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `exam-merge-${STAMP}`);

const db = new Database(DB_PATH, { readonly: !APPLY });
const arch = new Database(ARCH_DB, { readonly: true });

const COLS = ['exam_id', 'student_id', 'task_id', 'draft', 'attempts', 'runs', 'solved', 'solved_at', 'answer', 'result', 'submitted_at', 'submit_kind', 'locked', 'teacher_score', 'updated_at'];

function rank(r) {
  return [r.solved ? 1 : 0, r.submitted_at ? 1 : 0, r.attempts || r.runs || r.draft ? 1 : 0, r.updated_at || ''];
}

function better(a, b) {
  const x = rank(a);
  const y = rank(b);
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return x[i] > y[i] ? a : b;
  return a;
}

// ------------------------------------------------------------- exam_tasks ---

const here = new Map(db.prepare('SELECT * FROM exam_tasks WHERE exam_id = ?').all(EXAM).map((r) => [`${r.student_id}|${r.task_id}`, r]));
const there = arch.prepare('SELECT * FROM exam_tasks WHERE exam_id = ?').all(EXAM);
const plan = [];
for (const a of there) {
  const key = `${a.student_id}|${a.task_id}`;
  const h = here.get(key);
  if (!h) {
    plan.push({ key, action: 'insert', row: a });
    continue;
  }
  const pick = better(h, a);
  const row = { ...pick, attempts: (h.attempts || 0) + (a.attempts || 0) };
  if (pick === h && row.attempts === h.attempts) continue;
  plan.push({ key, action: 'update', row, from: pick === a ? 'архив' : 'здесь', here: h, there: a });
}

// ------------------------------------------------------------------ logs ---

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const students = [...new Set([
  ...fs.readdirSync(path.join(ARCH_DIR, 'logs')).map((f) => f.replace(/\.jsonl$/, '')),
])].filter((s) => /^[A-Za-z0-9._-]+$/.test(s));

const logPlan = students.map((s) => {
  const mine = readJsonl(path.join(HERE_DIR, 'logs', `${s}.jsonl`)).map((e) => ({ ...e, server: e.server || 'here' }));
  const theirs = readJsonl(path.join(ARCH_DIR, 'logs', `${s}.jsonl`)).map((e) => ({ ...e, server: e.server || 'archive' }));
  // Already merged earlier (or identical, like the trial run of TEST): nothing to add.
  const seen = new Set(mine.map((e) => `${e.ts}|${e.type}|${e.origSeq || e.seq}`));
  const add = theirs.filter((e) => !seen.has(`${e.ts}|${e.type}|${e.origSeq || e.seq}`));
  const merged = [...mine, ...add].sort((x, y) => (x.ts < y.ts ? -1 : x.ts > y.ts ? 1 : x.server === y.server ? (x.origSeq || x.seq) - (y.origSeq || y.seq) : x.server === 'here' ? -1 : 1));
  const lastHere = mine.length ? mine[mine.length - 1].ts : '';
  const lastThere = theirs.length ? theirs[theirs.length - 1].ts : '';
  return { student: s, mine: mine.length, theirs: theirs.length, add: add.length, merged, sandboxFrom: lastThere > lastHere ? 'archive' : 'here' };
});

// ----------------------------------------------------------------- report ---

console.log(`База: ${DB_PATH}`);
console.log(`Архив: ${ARCH_DB}, ${ARCH_DIR}\n`);
console.log(`exam_tasks: новых ${plan.filter((p) => p.action === 'insert').length}, изменить ${plan.filter((p) => p.action === 'update').length}`);
for (const p of plan.filter((x) => x.action === 'update')) {
  const s = (r) => `${r.solved ? 'решено' : 'не решено'}${r.submitted_at ? ', отправлено ' + r.submit_kind : ''}, попыток ${r.attempts}, запусков ${r.runs}`;
  console.log(`  ${p.key.padEnd(18)} здесь: ${s(p.here).padEnd(46)} архив: ${s(p.there).padEnd(46)} → берём: ${p.from}, попыток всего ${p.row.attempts}`);
}
console.log('\nЖурналы:');
for (const l of logPlan) {
  console.log(`  ${l.student.padEnd(12)} здесь ${String(l.mine).padStart(4)}, в архиве ${String(l.theirs).padStart(4)}, добавить ${String(l.add).padStart(4)} → ${l.merged.length}; песочница: ${l.sandboxFrom === 'archive' ? 'из архива' : 'здешняя'}`);
}

if (!APPLY) {
  console.log('\nЭто только отчёт. Выполнить: тот же вызов с --apply (сервер должен быть остановлен).');
  process.exit(0);
}

// ------------------------------------------------------------------ apply ---

fs.mkdirSync(BACKUP_DIR, { recursive: true });
db.prepare('VACUUM INTO ?').run(path.join(BACKUP_DIR, 'mdtask.db'));
for (const sub of ['logs', 'snapshots']) {
  if (fs.existsSync(path.join(HERE_DIR, sub))) fs.cpSync(path.join(HERE_DIR, sub), path.join(BACKUP_DIR, 'here', sub), { recursive: true });
}

const upsert = db.prepare(`INSERT INTO exam_tasks (${COLS.join(', ')}) VALUES (${COLS.map((c) => '@' + c).join(', ')})
  ON CONFLICT (exam_id, student_id, task_id) DO UPDATE SET ${COLS.slice(3).map((c) => `${c} = excluded.${c}`).join(', ')}`);
const delEvents = db.prepare('DELETE FROM exam_events WHERE exam_id = ? AND student_id = ?');
const addEvent = db.prepare('INSERT INTO exam_events (exam_id, student_id, seq, ts, stage, task, type, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

const SNAP = /^(\d{5})-([\d.]+)-([a-z_]+)\.py$/;

db.transaction(() => {
  for (const p of plan) upsert.run(Object.fromEntries(COLS.map((c) => [c, p.row[c] === undefined ? null : p.row[c]])));
  for (const l of logPlan) {
    if (!l.add) continue;
    delEvents.run(EXAM, l.student);
    l.merged.forEach((e, i) => {
      e.origSeq = e.origSeq || e.seq;
      e.seq = i + 1;
      addEvent.run(EXAM, l.student, e.seq, e.ts, e.stage, e.task, e.type, JSON.stringify(e.data || {}).slice(0, 300));
    });
  }
})();

for (const l of logPlan) {
  if (!l.add) continue;
  // Snapshots: <seq>-<task>-<kind>.py of each server, renamed to the new seq.
  const newSeq = new Map(l.merged.map((e) => [`${e.server}|${e.origSeq}`, e.seq]));
  const outDir = path.join(HERE_DIR, 'snapshots', l.student);
  const moved = [];
  for (const [server, dir] of [['here', path.join(BACKUP_DIR, 'here', 'snapshots', l.student)], ['archive', path.join(ARCH_DIR, 'snapshots', l.student)]]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(SNAP);
      const seq = m && newSeq.get(`${server}|${Number(m[1])}`);
      if (!seq) continue;
      moved.push([path.join(dir, name), `${String(seq).padStart(5, '0')}-${m[2]}-${m[3]}.py`]);
    }
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [src, name] of moved) fs.copyFileSync(src, path.join(outDir, name));
  fs.mkdirSync(path.join(HERE_DIR, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(HERE_DIR, 'logs', `${l.student}.jsonl`), l.merged.map((e) => JSON.stringify(e)).join('\n') + '\n');

  if (l.sandboxFrom === 'archive' && fs.existsSync(path.join(ARCH_DIR, 'sandbox', l.student))) {
    const dst = path.join(HERE_DIR, 'sandbox', l.student);
    if (fs.existsSync(dst)) fs.cpSync(dst, path.join(BACKUP_DIR, 'here', 'sandbox', l.student), { recursive: true });
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(path.join(ARCH_DIR, 'sandbox', l.student), dst, { recursive: true });
  }
}
console.log(`\nГотово. Резервная копия базы и журналов: ${BACKUP_DIR}`);
