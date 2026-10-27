// Данные админки курса «Начальный Python» (/admin/python-course, src/routes/admin-python-course.js): матрица
// «студент × урок» (теория + решено задач), сигналы для устной проверки и карточка студента с кодом и попытками.
const db = require('../../db');
const course = require('./index');

function students(q) {
  const needle = (q || '').toLowerCase();
  return db
    .getUsers()
    .filter((u) => course.canSeeCourse(u) && (!needle || u.name.toLowerCase().includes(needle) || u.id.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function rowFor(student) {
  const progress = course.progressMap(student.id);
  const sum = { attempts: 0, pastes: 0, aways: 0, awayMs: 0 };
  let lastAt = null;
  for (const item of progress.values()) {
    sum.attempts += item.stats.attempts || 0;
    sum.pastes += item.stats.pastes || 0;
    sum.aways += item.stats.aways || 0;
    sum.awayMs += item.stats.awayMs || 0;
    if (item.updatedAt && (!lastAt || item.updatedAt > lastAt)) lastAt = item.updatedAt;
  }
  const signals = [];
  if (sum.pastes) signals.push(`попытки вставки: ${sum.pastes}`);
  if (sum.awayMs >= 5 * 60000) signals.push(`вне страницы ${Math.round(sum.awayMs / 60000)} мин`);
  const lessons = course.LESSONS.filter((l) => l.ready).map((l) => ({
    key: l.key,
    theoryRead: progress.has(`${l.key}:theory`),
    solved: l.tasks.filter((t) => progress.get(t.id) && progress.get(t.id).solvedAt).length,
    total: l.tasks.length,
  }));
  return { student, lessons, solved: lessons.reduce((n, l) => n + l.solved, 0), sum, lastAt, signals };
}

function overview(filters = {}) {
  const lessons = course.LESSONS.filter((l) => l.ready);
  return { lessons, rows: students(filters.q).map(rowFor), total: lessons.reduce((n, l) => n + l.tasks.length, 0) };
}

function studentDetail(studentId) {
  const student = db.getUserById(studentId);
  if (!student || student.role !== 'student') return null;
  const progress = course.progressMap(student.id);
  return {
    student,
    row: rowFor(student),
    lessons: course.LESSONS.filter((l) => l.ready).map((l) => ({
      ...l,
      theory: progress.get(`${l.key}:theory`) || null,
      items: l.tasks.map((t) => {
        const item = progress.get(t.id) || null;
        return { task: t, item, attempts: item ? db.getPythonCourseAttempts(student.id, t.id, 10) : [] };
      }),
    })),
  };
}

module.exports = { overview, studentDetail };
