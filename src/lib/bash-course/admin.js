// Данные админки предмета «Bash: скрипты в Linux» (/admin/bash-course, src/routes/admin-bash-course.js):
// матрица «студент × тема» (теория + решено задач + отвечено вопросов), сигналы для устной проверки и карточка
// студента с кодом и попытками.
const db = require('../../db');
const course = require('./index');

function students(q, group) {
  const needle = (q || '').toLowerCase();
  return db
    .getUsers()
    .filter((u) => course.canSeeSubject(u) && (!group || u.group === group) && (!needle || u.name.toLowerCase().includes(needle) || u.id.toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

const readyTopics = () => course.TOPICS.filter((t) => t.ready);

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
  const solvedN = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  const topics = readyTopics().map((t) => ({
    key: t.key,
    number: t.number,
    title: t.title,
    theoryRead: progress.has(`${t.key}:theory`),
    solved: t.tasks.filter((x) => solvedN(x.id)).length,
    total: t.tasks.length,
    quizSolved: t.quiz.filter((q) => solvedN(q.id)).length,
    quizTotal: t.quiz.length,
  }));
  return {
    student,
    topics,
    solved: topics.reduce((n, t) => n + t.solved, 0),
    quizSolved: topics.reduce((n, t) => n + t.quizSolved, 0),
    sum,
    lastAt,
    signals,
  };
}

function overview(filters = {}) {
  const topics = readyTopics();
  return {
    topics,
    rows: students(filters.q, filters.group).map(rowFor),
    totalTasks: topics.reduce((n, t) => n + t.tasks.length, 0),
    totalQuiz: topics.reduce((n, t) => n + t.quiz.length, 0),
  };
}

function studentDetail(studentId) {
  const student = db.getUserById(studentId);
  if (!student || student.role !== 'student') return null;
  const progress = course.progressMap(student.id);
  return {
    student,
    row: rowFor(student),
    topics: readyTopics().map((t) => ({
      key: t.key,
      number: t.number,
      title: t.title,
      theory: progress.get(`${t.key}:theory`) || null,
      tasks: t.tasks.map((task) => {
        const item = progress.get(task.id) || null;
        return { task, item, attempts: item ? db.getBashCourseAttempts(student.id, task.id, 10) : [] };
      }),
      quiz: t.quiz.map((q) => {
        const item = progress.get(q.id) || null;
        return { q, solved: Boolean(item && item.solvedAt), attempts: item ? item.stats.attempts : 0, lastChoice: item ? item.lastChoice : null };
      }),
    })),
  };
}

module.exports = { overview, studentDetail };
