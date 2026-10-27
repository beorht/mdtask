// Итоговая контрольная работа группы IB «Расследование и восстановление сервера» (plan:
// docs/exam-ib-plan.md). Six stages, free order, one variant per student:
//   1 Linux reconnaissance, 2 the attack in the application log, 5 Caesar — flags found in the
//     student's terminal sandbox (scenario.js, sandbox.js);
//   3 programming — two hand-written algorithms (algorithms.js) and five programs with a bug
//     (bugs.js: 4 runs, one submission, then locked);
//   4 SQL on the student's copy of the company database (sql.js);
//   6 the incident report, graded by the teacher.
// The exam is visible only inside its window (TEST: always) and while it runs (or while the
// teacher keeps it closed) the group's other practical work is locked. Scores are shown after the teacher publishes them.
const crypto = require('crypto');
const { hasFullAccess } = require('../test-access');
const db = require('../../db');
const { THEMES, THEME_KEYS } = require('./themes');
const { buildScenario } = require('./scenario');
const { algorithmTask, algorithmRefs } = require('./algorithms');
const { bugTask, bugRefs } = require('./bugs');
const sql = require('./sql');

const EXAMS = {
  'ib-final-1': {
    id: 'ib-final-1',
    title: 'Итоговая контрольная работа',
    subtitle: 'Расследование и восстановление сервера',
    group: 'ib-2', // группа IB переименована 27.10.2026 (scripts/fixes/2026-10-27-regroup.js)
    // 20 November 2026, two pairs from 9:00 (+05) with the break: 9:00–11:50.
    startsAt: '2026-11-20T04:00:00.000Z',
    endsAt: '2026-11-20T06:50:00.000Z',
  },
};

const STAGES = [
  { n: 1, title: 'Разведка в Linux', icon: '🖥️', kind: 'flags', terminal: true },
  { n: 2, title: 'Поиск проблемы в журналах сервера', icon: '📜', kind: 'flags', terminal: true },
  { n: 3, title: 'Программирование: алгоритмы и поиск ошибок', icon: '🐍', kind: 'code' },
  { n: 4, title: 'SQL: ущерб и восстановление', icon: '🗄️', kind: 'sql' },
  { n: 5, title: 'Шифр Цезаря: доступ к защищённому файлу', icon: '🔐', kind: 'flags', terminal: true },
  { n: 6, title: 'Отчёт об инциденте', icon: '📝', kind: 'report' },
];

const REPORT_TASK = '6.1';
const REPORT_POINTS = 10;
const REPORT_FIELDS = [
  { key: 'timeline', label: 'Хронология', hint: 'что и когда произошло: подбор пароля, вход, действия злоумышленника' },
  { key: 'cause', label: 'Причина', hint: 'почему атака удалась' },
  { key: 'actions', label: 'Что сделано', hint: 'какие данные восстановлены и какие меры приняты' },
  { key: 'recommendations', label: 'Рекомендации', hint: 'что сделать, чтобы это не повторилось' },
];
const MAX_REPORT_FIELD = 4000;

function getExamDef(id) {
  return EXAMS[id] || null;
}

// ------------------------------------------------------------------ window ---

function examWindow(exam) {
  return db.ensureExam(exam.id, exam.startsAt, exam.endsAt);
}

function phaseOf(win, now = Date.now()) {
  if (now < Date.parse(win.startsAt)) return 'before';
  if (now >= Date.parse(win.endsAt)) return 'closed';
  return 'open';
}

// TEST sees the exam open at any time (for a trial run before the real one).
function phaseFor(exam, user, win = examWindow(exam)) {
  return hasFullAccess(user) ? 'open' : phaseOf(win);
}

// The group's practical work (IB tasks, SQL trainer, assignments, course subjects) is closed
// while its exam runs, and also whenever the teacher closed it (exams.lock_practice) until
// they open it again. `during` tells the two apart for the page text.
function examLockFor(user) {
  if (!user || user.role !== 'student' || hasFullAccess(user)) return null;
  // The WEB group's exam (src/lib/web-exam) uses the same window table and locks the same way.
  const webExam = require('../web-exam');
  const all = [...Object.values(EXAMS).map((e) => [e, examWindow]), ...Object.values(webExam.EXAMS).map((e) => [e, webExam.examWindow])];
  for (const [exam, windowOf] of all) {
    if (user.group !== exam.group) continue;
    const win = windowOf(exam);
    const during = phaseOf(win) === 'open';
    if (during || win.lockPractice) return { ...exam, window: win, during };
  }
  return null;
}

// ---------------------------------------------------------------- variants ---

function newSeed(examId, studentId) {
  return `${examId}:${studentId}:${crypto.randomBytes(6).toString('hex')}`;
}

// The variant of the index-th student of the group: 3 themes × 3 algorithm pairs × 2 wordings.
function variantForIndex(index) {
  const i = ((index % 18) + 18) % 18;
  return { index: i, theme: THEME_KEYS[i % 3], algorithms: algorithmRefs(i), bugs: bugRefs(i) };
}

function issueVariant(exam, studentId, index, seed = newSeed(exam.id, studentId)) {
  const variant = variantForIndex(index);
  db.saveExamVariant(exam.id, studentId, variant.theme, seed, { index: variant.index, algorithms: variant.algorithms, bugs: variant.bugs });
  return db.getExamVariant(exam.id, studentId);
}

// ---------------------------------------------------------------- the tasks ---

const scenarioCache = new Map();

function scenarioOf(variant) {
  const key = `${variant.seed}/${variant.theme}`;
  if (!scenarioCache.has(key)) scenarioCache.set(key, buildScenario(variant.seed, variant.theme));
  return scenarioCache.get(key);
}

function flagTasks(p) {
  const q = (id, title, text, check, points) => ({ id, kind: 'flag', title, text, check, points });
  return {
    1: [
      q('1.1', 'Конфигурационный файл', `С каким конфигурационным файлом запускается служба \`${p.app}\`? Укажите полный путь к файлу.`, 'path', 2.5),
      q('1.2', 'Порт службы', 'На каком порту работает служба — по её **действующему** конфигурационному файлу?', 'number', 2.5),
      q('1.3', 'Файл базы данных', 'Полный путь к файлу базы данных, с которой работает служба.', 'path', 2.5),
      q('1.4', 'Права на базу данных', 'Права доступа к файлу базы данных в числовом виде (например, 644).', 'mode', 2.5),
    ],
    2: [
      q('2.1', 'Адрес злоумышленника', 'С какого IP-адреса после серии неудачных попыток был выполнен вход в систему?', 'ip', 5),
      q('2.2', 'Время входа', 'Во сколько злоумышленник вошёл в систему? Ответ — время в виде ЧЧ:ММ:СС.', 'time', 5),
      q('2.3', 'Подбор пароля', 'Сколько неудачных попыток входа было с этого IP-адреса?', 'number', 5),
    ],
    5: [
      q('5.1', 'Пароль к резервной базе', `Расшифрованный пароль к резервной базе \`${p.secretDb}\`.`, 'text', 5),
      q('5.2', 'Код доступа', `Код доступа для службы «${p.secretService}» из таблицы \`access_codes\` резервной базы.`, 'code', 5),
    ],
  };
}

function stageIntro(n, p) {
  const intros = {
    1: `Вы — новый администратор сервера: ${p.company}. На сервере работает ${p.service} — служба \`${p.app}\`. ` +
      'Подключитесь к серверу в терминале (логин и пароль — те же, что на сайте) и выясните, как устроена служба. ' +
      'Описания служб systemd лежат в `/etc/systemd/system`. Пригодятся: `ls -l`, `cd`, `find`, `grep`, `cat`, `sudo`.',
    2: 'Утром 19 ноября сотрудники заметили, что часть данных изменилась. Найдите в журнале службы, что произошло ночью. ' +
      `Журнал — \`${p.logPath}\`, читается через \`sudo\`. Одна строка — одно событие: \`дата время IP действие учётная_запись подробности\`. ` +
      'Действия: `LOGIN_OK` — успешный вход, `LOGIN_FAIL` — неудачная попытка входа, `LOGOUT` — выход, `VIEW`, `UPDATE`, `DELETE`, `INSERT`, `EXPORT` — работа с данными. ' +
      'Пригодятся: `grep`, `wc -l`, `sort`, `uniq -c`, `head`, `tail`, `cut`.',
    3: 'Программы запускаются прямо в браузере. В заданиях 3.1–3.2 алгоритм нужно написать самим. ' +
      'В заданиях 3.3–3.7 дана готовая программа с ошибкой: найдите ошибку, исправьте и запустите снова. ' +
      'У каждой такой программы **4 запуска и одна отправка на проверку**; после отправки или после 4-го запуска задание закрывается.',
    4: `Данные службы лежат в базе SQLite. Здесь у вас своя копия этой базы: каждый запуск начинается с исходных данных, так что ошибка в UPDATE ничего не испортит. ` +
      'Сначала посмотрите таблицы ниже, потом пишите запрос.',
    5: `Прежний администратор оставил в домашнем каталоге записку \`~/handover.txt\`. Резервная база \`${p.secretDb}\` защищена паролем: ` +
      'команда `sqlite3` запросит его. Пароль спрятан в скрытом файле в домашнем каталоге и зашифрован шифром Цезаря. ' +
      'Найдите файл, расшифруйте пароль, откройте базу и найдите код доступа. Пригодятся: `ls -la`, `find`, `grep -r`, `cat`, `sqlite3`.',
    6: 'Опишите инцидент для руководства: что произошло, почему, что вы сделали и что советуете. ' +
      'Пишите своими словами по тому, что нашли на этапах 1–5. Отчёт можно сохранять и отправлять заново до конца контрольной; оценивает преподаватель.',
  };
  return intros[n];
}

// Every task of the student's variant, in stage order.
function tasksOf(variant) {
  const scenario = scenarioOf(variant);
  const p = scenario.params;
  const flags = flagTasks(p);
  const tasks = [];
  const add = (stage, task) => tasks.push({ ...task, stage });
  flags[1].forEach((t) => add(1, t));
  flags[2].forEach((t) => add(2, t));
  variant.algorithms.forEach((ref, i) => add(3, algorithmTask(variant.theme, ref, variant.seed, i + 1)));
  variant.bugs.forEach((short, i) => add(3, bugTask(variant.theme, short, i + 3)));
  sql.tasksFor(p).forEach((t) => add(4, { ...t, kind: 'sql' }));
  flags[5].forEach((t) => add(5, t));
  add(6, { id: REPORT_TASK, kind: 'report', title: 'Отчёт об инциденте', points: REPORT_POINTS });
  return tasks;
}

function findTask(variant, taskId) {
  return tasksOf(variant).find((t) => t.id === taskId) || null;
}

function maxScore(tasks) {
  return tasks.reduce((sum, t) => sum + t.points, 0);
}

// ------------------------------------------------------------------- flags ---

function normalizeFlag(kind, value) {
  let v = String(value || '').trim().replace(/^["'`«]+|["'`»]+$/g, '').trim();
  if (kind === 'path') return v.replace(/\/+$/, '').replace(/\/{2,}/g, '/');
  if (kind === 'number') return v.replace(/^0+(?=\d)/, '');
  if (kind === 'mode') return v.replace(/^0+(?=\d{3})/, '');
  if (kind === 'time') {
    const m = v.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}:${m[3]}` : v;
  }
  if (kind === 'text' || kind === 'code') return v.toLowerCase();
  return v;
}

function checkFlag(task, answer, variant) {
  const expected = scenarioOf(variant).answers[task.id];
  return normalizeFlag(task.check, answer) === normalizeFlag(task.check, expected);
}

// ------------------------------------------------------------------ scores ---

function rowsByTask(rows) {
  return new Map(rows.map((r) => [r.taskId, r]));
}

// Points of each task (the report: the teacher's score, null until graded).
function scoreTasks(tasks, rows) {
  const byTask = rowsByTask(rows);
  let total = 0;
  let pending = false;
  const items = tasks.map((t) => {
    const row = byTask.get(t.id) || null;
    let points;
    if (t.kind === 'report') {
      points = row && row.teacherScore !== null && row.teacherScore !== undefined ? row.teacherScore : null;
      if (points === null) pending = true;
    } else {
      points = row && row.solved ? t.points : 0;
    }
    total += points || 0;
    return { task: t, row, points };
  });
  return { items, total: Math.round(total * 10) / 10, max: maxScore(tasks), pending };
}

function gradeOf(total) {
  if (total >= 86) return 5;
  if (total >= 71) return 4;
  if (total >= 56) return 3;
  return 2;
}

// ---------------------------------------------------------------- closing ---

// After the end: unsent bug programs and reports are sent as they are (once per window).
function finalizeIfDue(exam, win = examWindow(exam)) {
  if (win.finalizedAt || phaseOf(win) !== 'closed') return 0;
  const bugIds = [3, 4, 5, 6, 7].map((n) => `3.${n}`);
  const sent = db.finalizeExamTasks(exam.id, bugIds, REPORT_TASK);
  db.setExamFinalized(exam.id);
  return sent;
}

module.exports = {
  EXAMS,
  STAGES,
  THEMES,
  REPORT_TASK,
  REPORT_FIELDS,
  MAX_REPORT_FIELD,
  getExamDef,
  examWindow,
  phaseOf,
  phaseFor,
  examLockFor,
  variantForIndex,
  issueVariant,
  scenarioOf,
  stageIntro,
  tasksOf,
  findTask,
  checkFlag,
  normalizeFlag,
  scoreTasks,
  gradeOf,
  finalizeIfDue,
};
