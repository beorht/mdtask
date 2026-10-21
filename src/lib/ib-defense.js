// Control questions on the site after an IB task without the stage engine is solved (№3 caesar, №4 configs):
// two questions about the student's own task, 60 seconds each, one attempt, shown on the task page.
// Answers can't be changed; a wrong or late answer is a signal for the teacher (the task stays solved).
const path = require('path');
const crypto = require('crypto');
const db = require('../db');

const SECONDS = 60;
const DIR_FALLBACK = ['Documents/backup', '.config/app', 'Downloads', '.cache/thumbnails', 'Pictures/2024', 'Music', '.local/share'];

function rngFrom(seed) {
  let x = parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0, 8), 16) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1e6) / 1e6;
  };
}

function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Options are shuffled; the first in `options` is the correct one.
function question(text, options, rnd) {
  const order = shuffle(options.map((_, i) => i), rnd);
  return { text, options: order.map((i) => options[i]), correct: order.indexOf(0) };
}

function distinctNumbers(right, rnd, from, to, n = 3) {
  const out = [];
  while (out.length < n) {
    const v = from + Math.floor(rnd() * (to - from + 1));
    if (v !== right && !out.includes(v)) out.push(v);
  }
  return out;
}

function caesarQuestions(studentId, rnd) {
  const row = db.getCaesarSecretForStudent(studentId);
  if (!row) return [];
  const dir = path.posix.dirname(row.hidden_file_path);
  const others = [...new Set(db.getCaesarHiddenDirs().map((p) => path.posix.dirname(p)).concat(DIR_FALLBACK))].filter((d) => d !== dir);
  return [
    question(
      'Каким был сдвиг шифра Цезаря в вашем задании?',
      [String(row.caesar_shift), ...distinctNumbers(row.caesar_shift, rnd, 2, 25).map(String)],
      rnd
    ),
    question(`В каком каталоге (от ~) лежал файл с зашифрованным ${row.variant === 'path' ? 'путём' : 'паролем'}?`, [dir, ...shuffle(others, rnd).slice(0, 3)], rnd),
  ];
}

function configsQuestions(studentId, rnd) {
  const row = db.getConfigTaskForStudent(studentId);
  if (!row) return [];
  const p = row.params || {};
  const bank = [
    question('Какой порт SSH вы установили на своём сервере?', [String(p.ssh_port), String(p.apache_port), '22', '2222'].filter((v, i, a) => a.indexOf(v) === i).concat(['8022']).slice(0, 4), rnd),
    question('В каком файле upload_max_filesize действует для Apache?', [
      '/etc/php/8.2/apache2/php.ini', '/etc/php/8.2/cli/php.ini', '/usr/lib/php/8.2/php.ini-production', '/etc/apache2/apache2.conf',
    ], rnd),
    question('Port в настройках sshd указан дважды (в sshd_config.d и в sshd_config). Какое значение действует?', [
      'первое встреченное (с учётом Include)', 'последнее в sshd_config', 'наибольшее', 'sshd не запустится',
    ], rnd),
  ];
  return [bank[0], bank[1 + Math.floor(rnd() * 2)]];
}

const BUILDERS = { caesar: caesarQuestions, configs: configsQuestions };

function supported(taskKey) {
  return !!BUILDERS[taskKey];
}

// What the task page shows: null (no questions for this task / not solved yet), or the state.
function stateFor(task, studentId, now = Date.now()) {
  if (!supported(task.key) || !task.solved) return null;
  const row = db.getIbTaskDefense(task.key, studentId);
  if (!row) return { status: 'ready', total: 2 };
  const i = row.results.length;
  if (row.finished_at || i >= row.questions.length) {
    return { status: 'done', total: row.questions.length, good: row.results.filter((r) => r.ok).length };
  }
  const left = Math.max(0, SECONDS - Math.floor((now - Date.parse(row.asked_at)) / 1000));
  const q = row.questions[i];
  return { status: 'asking', number: i + 1, total: row.questions.length, text: q.text, options: q.options, left };
}

function start(task, studentId, now = Date.now()) {
  if (!supported(task.key) || !task.solved || db.getIbTaskDefense(task.key, studentId)) return;
  const rnd = rngFrom(`${task.key}:${studentId}:${now}`);
  const questions = BUILDERS[task.key](studentId, rnd);
  if (!questions.length) return;
  db.saveIbTaskDefense(task.key, studentId, { questions, results: [], askedAt: new Date(now).toISOString() });
}

function answer(task, studentId, choice, now = Date.now()) {
  const row = db.getIbTaskDefense(task.key, studentId);
  if (!row || row.finished_at || row.results.length >= row.questions.length) return;
  const q = row.questions[row.results.length];
  const seconds = Math.round((now - Date.parse(row.asked_at)) / 1000);
  const late = seconds > SECONDS;
  const n = Number.parseInt(choice, 10);
  const results = row.results.concat([{ choice: Number.isInteger(n) ? n : null, ok: !late && n === q.correct, late, seconds, at: new Date(now).toISOString() }]);
  const finished = results.length >= row.questions.length;
  db.saveIbTaskDefense(task.key, studentId, {
    questions: row.questions,
    results,
    askedAt: new Date(now).toISOString(),
    finishedAt: finished ? new Date(now).toISOString() : null,
  });
}

module.exports = { SECONDS, supported, stateFor, start, answer };
