// Блок D ИБ-контрольной: «Анализ журналов». Две задачи — студент пишет программу на Python, которая
// читает файл журнала data.log, анализирует его и печатает результат (нежелательные входы / утечки
// паролей). Проверка — как в блоке B: программа запускается в браузере на ДВУХ наборах (видимый +
// проверочный), выводы сверяются с эталоном (эталон считается здесь на тех же данных регулярками).
// Данные персональные (seed), поэтому общего захардкоженного ответа нет.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function rngOf(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const intIn = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pad = (n) => String(n).padStart(2, '0');

const USERS = ['anna', 'boris', 'denis', 'elena', 'igor', 'katya', 'oleg', 'sveta', 'admin', 'deploy'];
const SECRETS = ['Qx7mra', 'Zubr42', 'Pole9k', 'Vesna7', 'Kod128', 'Mira55', 'Luna3x', 'Grom88'];

// ---- D1: нежелательные входы (успешный вход с ВНЕШНЕГО IP, т.е. не из сети 10.*) ----
function d1Log(seed) {
  const r = rngOf(seed);
  const lines = [];
  const n = intIn(r, 16, 24);
  for (let i = 0; i < n; i += 1) {
    const user = pick(r, USERS);
    const internal = r() < 0.6;
    const ip = internal ? `10.0.${intIn(r, 0, 5)}.${intIn(r, 1, 254)}` : `${intIn(r, 80, 203)}.${intIn(r, 0, 255)}.${intIn(r, 0, 255)}.${intIn(r, 1, 254)}`;
    const ok = r() < 0.55;
    const ts = `Nov 03 ${pad(intIn(r, 0, 23))}:${pad(intIn(r, 0, 59))}:${pad(intIn(r, 0, 59))}`;
    lines.push(`${ts} seclab sshd[${intIn(r, 1000, 9999)}]: ${ok ? 'Accepted' : 'Failed'} password for ${user} from ${ip} port ${intIn(r, 40000, 65000)} ssh2`);
  }
  return lines.join('\n') + '\n';
}
function d1Expected(log) {
  const set = new Set();
  const re = /Accepted password for (\S+) from (\d+\.\d+\.\d+\.\d+)/g;
  let m;
  while ((m = re.exec(log))) { if (!m[2].startsWith('10.')) set.add(m[1]); }
  return [...set].sort().join('\n');
}

// ---- D2: утечки паролей в журналах (значения после password=) ----
function d2Log(seed) {
  const r = rngOf(seed);
  const lines = [];
  const n = intIn(r, 16, 24);
  for (let i = 0; i < n; i += 1) {
    const user = pick(r, USERS);
    const ts = `2026-11-03 ${pad(intIn(r, 0, 23))}:${pad(intIn(r, 0, 59))}:${pad(intIn(r, 0, 59))}`;
    const leak = r() < 0.4;
    if (leak) lines.push(`${ts} INFO login user=${user} password=${pick(r, SECRETS)} ok`);
    else lines.push(`${ts} INFO request user=${user} path=/api/${pick(r, ['list', 'save', 'open', 'ping'])} status=200`);
  }
  return lines.join('\n') + '\n';
}
function d2Expected(log) {
  const set = new Set();
  const re = /password=(\S+)/g;
  let m;
  while ((m = re.exec(log))) set.add(m[1]);
  return [...set].sort().join('\n');
}

const TASKS = {
  'd1-logins': {
    id: 'd1-logins', title: 'Нежелательные входы', log: d1Log, expected: d1Expected,
    statement: [
      'В файле **data.log** — журнал входов `auth.log`. Строки успешного входа имеют вид: `... Accepted password for ИМЯ from IP port ... ssh2`, неуспешного — `Failed ...`.',
      'Внутренняя сеть сервера — `10.0.0.0/8` (адреса, начинающиеся с `10.`). Вход с любого другого адреса считается внешним и нежелательным.',
      'Напишите программу на Python, которая прочитает data.log и выведет **логины, которые успешно вошли с внешнего IP** (не из сети 10.*): по одному на строку, по алфавиту, **без повторов**.',
      'Если таких нет — вывод пустой.',
    ].join('\n\n'),
  },
  'd2-secrets': {
    id: 'd2-secrets', title: 'Утечки паролей в журналах', log: d2Log, expected: d2Expected,
    statement: [
      'В файле **data.log** — журнал приложения. По ошибке в некоторых строках в журнал попал пароль в виде `password=ЗНАЧЕНИЕ` (пароли в журналах — утечка, их быть не должно).',
      'Напишите программу на Python, которая прочитает data.log и выведет **все уникальные значения паролей**, попавшие в журнал (то, что идёт после `password=`): по одному на строку, по алфавиту, без повторов.',
      'Если утечек нет — вывод пустой.',
    ].join('\n\n'),
  },
};

function isBlockDTask(id) { return Object.prototype.hasOwnProperty.call(TASKS, id); }

function datasetsFor(studentId, taskId) {
  const t = TASKS[taskId];
  const log1 = t.log(hash(`${studentId}:${taskId}:1`));
  const log2 = t.log(hash(`${studentId}:${taskId}:2`));
  return { log1, log2, expected: [t.expected(log1), t.expected(log2)] };
}

function view(studentId, taskId) {
  const t = TASKS[taskId];
  const d = datasetsFor(studentId, taskId);
  return { id: t.id, title: t.title, statement: t.statement, datafile: 'data.log', datasets: [d.log1, d.log2] };
}

function check(studentId, taskId, outputs) {
  const d = datasetsFor(studentId, taskId);
  const norm = (x) => String(x == null ? '' : x).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
  const outs = Array.isArray(outputs) ? outputs : [];
  const results = d.expected.map((exp, i) => ({ ok: norm(outs[i]) === norm(exp) }));
  const solved = results.length === 2 && results.every((r) => r.ok);
  let hint = null;
  if (!solved) {
    if (results[0] && results[0].ok && results[1] && !results[1].ok) hint = 'На проверочном наборе не совпало — похоже, ответ где-то задан вручную, а не найден в журнале.';
    else hint = 'Вывод не совпал. Проверьте регулярное выражение, уникальность и сортировку по алфавиту.';
  }
  return { solved, results, hint };
}

module.exports = { TASKS, isBlockDTask, view, check, datasetsFor };
