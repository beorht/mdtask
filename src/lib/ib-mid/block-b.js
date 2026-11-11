// Блок B ИБ-контрольной: две задачи «Python + sqlite3: анализ таблицы».
// Студенту даётся готовая таблица с данными (файл data.sql) и описание — он пишет программу на Python,
// которая загружает данные в sqlite3, выполняет анализ и печатает результат в заданном формате.
// Проверка: программа запускается в браузере (Pyodide, python-worker.js) на ДВУХ наборах данных
// (видимый + проверочный), оба вывода должны совпасть с эталоном. Эталон считается здесь через
// better-sqlite3 — тем же SQL, что и у студента, поэтому он заведомо верен. Данные персональные (seed).
const Database = require('better-sqlite3');

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function rngOf(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const intIn = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ---- Задача B1: продажи ----
const CATEGORIES = ['Электроника', 'Книги', 'Одежда', 'Игрушки', 'Спорт'];
const PRODUCTS = ['Альфа', 'Бета', 'Гамма', 'Дельта', 'Омега', 'Сигма'];

function salesRows(seed) {
  const r = rngOf(seed);
  const rows = [];
  const n = intIn(r, 20, 26);
  for (let i = 1; i <= n; i += 1) {
    rows.push({ id: i, category: pick(r, CATEGORIES), product: pick(r, PRODUCTS), amount: intIn(r, 1, 50) * 100, day: `2026-11-${String(intIn(r, 1, 28)).padStart(2, '0')}` });
  }
  return rows;
}
function salesSql(rows) {
  let sql = 'CREATE TABLE sales (id INTEGER PRIMARY KEY, category TEXT, product TEXT, amount INTEGER, day TEXT);\n';
  for (const x of rows) sql += `INSERT INTO sales VALUES (${x.id}, ${q(x.category)}, ${q(x.product)}, ${x.amount}, ${q(x.day)});\n`;
  return sql;
}
function salesExpected(sql) {
  const db = new Database(':memory:');
  db.exec(sql);
  const rows = db.prepare('SELECT category, SUM(amount) AS total FROM sales GROUP BY category ORDER BY total DESC, category ASC').all();
  db.close();
  return rows.map((x) => `${x.category}: ${x.total}`).join('\n');
}

// ---- Задача B2: журнал входов ----
const USERS = ['anna', 'boris', 'denis', 'elena', 'igor', 'katya', 'oleg', 'sveta'];

function loginsRows(seed) {
  const r = rngOf(seed);
  const rows = [];
  const n = intIn(r, 30, 40);
  for (let i = 1; i <= n; i += 1) {
    rows.push({ id: i, username: pick(r, USERS), ip: `10.0.${intIn(r, 0, 5)}.${intIn(r, 1, 254)}`, success: r() < 0.45 ? 1 : 0, ts: `2026-11-03 ${String(intIn(r, 8, 20)).padStart(2, '0')}:${String(intIn(r, 0, 59)).padStart(2, '0')}` });
  }
  return rows;
}
function loginsSql(rows) {
  let sql = 'CREATE TABLE logins (id INTEGER PRIMARY KEY, username TEXT, ip TEXT, success INTEGER, ts TEXT);\n';
  for (const x of rows) sql += `INSERT INTO logins VALUES (${x.id}, ${q(x.username)}, ${q(x.ip)}, ${x.success}, ${q(x.ts)});\n`;
  return sql;
}
function loginsExpected(sql) {
  const db = new Database(':memory:');
  db.exec(sql);
  // пользователи с 3+ неудачными входами (success=0), по убыванию числа неудач, затем по имени
  const rows = db.prepare(
    'SELECT username, COUNT(*) AS fails FROM logins WHERE success = 0 GROUP BY username HAVING fails >= 3 ORDER BY fails DESC, username ASC'
  ).all();
  db.close();
  return rows.map((x) => `${x.username}: ${x.fails}`).join('\n');
}

const TASKS = {
  'b1-sales': {
    id: 'b1-sales',
    title: 'Отчёт по продажам',
    rows: salesRows,
    sql: salesSql,
    expected: salesExpected,
    statement: [
      'В файле **data.sql** — таблица `sales` с полями: `id` (INTEGER), `category` (TEXT), `product` (TEXT), `amount` (INTEGER, выручка), `day` (TEXT, дата).',
      'Напишите на Python программу (`main.py`), которая:',
      '1. открывает соединение sqlite3 и загружает данные из data.sql (`executescript(open("data.sql").read())`);',
      '2. считает **суммарную выручку по каждой категории**;',
      '3. печатает строки в формате `категория: сумма`, по убыванию суммы, при равенстве — по алфавиту категории.',
      'Пример одной строки вывода: `Книги: 12300`. Никаких других строк выводить не нужно.',
    ].join('\n\n'),
  },
  'b2-logins': {
    id: 'b2-logins',
    title: 'Журнал входов',
    rows: loginsRows,
    sql: loginsSql,
    expected: loginsExpected,
    statement: [
      'В файле **data.sql** — таблица `logins` с полями: `id` (INTEGER), `username` (TEXT), `ip` (TEXT), `success` (INTEGER: 1 — удачный вход, 0 — неудачный), `ts` (TEXT, время).',
      'Напишите на Python программу (`main.py`), которая:',
      '1. открывает соединение sqlite3 и загружает данные из data.sql;',
      '2. находит пользователей, у которых **3 и более неудачных входов** (`success = 0`);',
      '3. печатает строки в формате `имя: число_неудач`, по убыванию числа неудач, при равенстве — по алфавиту имени.',
      'Пример одной строки вывода: `boris: 5`. Если таких пользователей нет — вывод пустой.',
    ].join('\n\n'),
  },
};

function isBlockBTask(taskId) {
  return Object.prototype.hasOwnProperty.call(TASKS, taskId);
}

// Два набора данных для студента (seed из id+задания) и эталоны к ним. expected клиенту не отдаём.
function datasetsFor(studentId, taskId) {
  const t = TASKS[taskId];
  const s1 = hash(`${studentId}:${taskId}:1`);
  const s2 = hash(`${studentId}:${taskId}:2`);
  const sql1 = t.sql(t.rows(s1));
  const sql2 = t.sql(t.rows(s2));
  return { sql1, sql2, expected: [t.expected(sql1), t.expected(sql2)] };
}

function view(studentId, taskId) {
  const t = TASKS[taskId];
  const d = datasetsFor(studentId, taskId);
  return { id: t.id, title: t.title, statement: t.statement, datasets: [d.sql1, d.sql2] };
}

// Проверка двух выводов студента. -> { solved, results:[{ok}], hint }
function check(studentId, taskId, outputs) {
  const d = datasetsFor(studentId, taskId);
  const norm = (x) => String(x == null ? '' : x).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n').replace(/\n+$/, '');
  const outs = Array.isArray(outputs) ? outputs : [];
  const results = d.expected.map((exp, i) => ({ ok: norm(outs[i]) === norm(exp) }));
  const solved = results.length === 2 && results.every((r) => r.ok);
  let hint = null;
  if (!solved) {
    if (results[0] && !results[0].ok && results[1] && results[1].ok) hint = 'На основном наборе вывод не совпал — проверьте формат строк и сортировку.';
    else if (results[0] && results[0].ok && results[1] && !results[1].ok) hint = 'На проверочном наборе вывод не совпал — похоже, значение где-то задано вручную, а не вычислено из таблицы.';
    else hint = 'Вывод не совпал с ожидаемым. Сверьте формат (категория/имя, двоеточие, пробел), сортировку и условие.';
  }
  return { solved, results, hint };
}

module.exports = { TASKS, isBlockBTask, view, check, datasetsFor };
