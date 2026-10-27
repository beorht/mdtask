// Данные админки предмета «Web-разработка: HTML» (/admin/html, src/routes/admin-html.js): матрица «студент × задание»
// по темам, сигналы для устной проверки и карточка студента с кодом решений и журналом.
const db = require('../../db');
const course = require('./index');

function students(group) {
  return db
    .getUsers()
    .filter((u) => course.canSeeHtml(u) && (!group || u.group === group))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function cellState(stats) {
  if (!stats) return 'none';
  if (stats.solvedAt) return 'solved';
  if (stats.attempts) return stats.lastStatus === 'partial' ? 'partial' : 'tried';
  return 'opened';
}

function rowFor(student, topics) {
  const progress = course.progressMap(student.id);
  const sum = { attempts: 0, pastes: 0, aways: 0, awayMs: 0, afterAway: 0, clientMismatch: 0 };
  let lastAt = null;
  for (const stats of progress.values()) {
    sum.attempts += stats.attempts;
    sum.pastes += stats.pastes;
    sum.aways += stats.aways;
    sum.awayMs += stats.awayMs;
    sum.afterAway += stats.solvedAfterAway ? 1 : 0;
    sum.clientMismatch += stats.clientMismatch || 0;
    if (stats.lastAt && (!lastAt || stats.lastAt > lastAt)) lastAt = stats.lastAt;
  }
  const signals = [];
  if (sum.pastes) signals.push(`вставки: ${sum.pastes}`);
  if (sum.afterAway) signals.push(`решено сразу после ухода: ${sum.afterAway}`);
  if (sum.clientMismatch) signals.push(`браузер ≠ сервер: ${sum.clientMismatch}`);
  if (sum.awayMs >= 5 * 60000) signals.push(`вне страницы ${Math.round(sum.awayMs / 60000)} мин`);
  return {
    student,
    topics: topics.map((t) => ({
      key: t.key,
      theoryRead: progress.has(`${t.key}:theory`),
      cells: t.tasks.map((task) => cellState(progress.get(task.id))),
      solved: t.tasks.filter((task) => progress.get(task.id) && progress.get(task.id).solvedAt).length,
    })),
    solved: [...progress.entries()].filter(([id, s]) => course.TASK_BY_ID.has(id) && s.solvedAt).length,
    sum,
    lastAt,
    signals,
  };
}

function overview(filters = {}) {
  const topics = course.TOPICS.filter((t) => t.ready);
  const q = (filters.q || '').toLowerCase();
  const rows = students(filters.group)
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    .map((s) => rowFor(s, topics));
  return { topics, rows, total: topics.reduce((n, t) => n + t.tasks.length, 0), soon: course.TOPICS.filter((t) => !t.ready) };
}

function studentDetail(studentId) {
  const student = db.getUserById(studentId);
  if (!student || student.role !== 'student') return null;
  const topics = course.TOPICS.filter((t) => t.ready);
  const progress = course.progressMap(student.id);
  return {
    student,
    row: rowFor(student, topics),
    topics: topics.map((t) => ({
      ...t,
      theory: progress.get(`${t.key}:theory`) || null,
      items: t.tasks.map((task) => ({ task, stats: progress.get(task.id) || null, state: cellState(progress.get(task.id)) })),
    })),
    events: db.getHtmlEvents(student.id, 300),
  };
}

module.exports = { overview, studentDetail };
