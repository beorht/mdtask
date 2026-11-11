// Данные для админ-раздела средней контрольной ИБ (/admin/ib-mid): матрица «студент × задание»
// и карточка одного студента с его работами. Читает ib_mid_progress.
const db = require('../../db');
const mid = require('./index');

// Статус задания у студента → ключ STATUS_META (src/lib/admin-data.js) для единых бейджей.
const STATUS_KEY = {
  not_started: 'not_submitted',
  in_progress: 'in_progress',
  submitted: 'pending',
  done: 'done',
  not_done: 'not_done',
};
// Статус → компактный символ/класс для ячейки матрицы (a-emmet-cell).
const CELL = {
  not_started: ['·', 'none'],
  in_progress: ['◐', 'opened'],
  submitted: ['●', 'partial'],
  done: ['✓', 'solved'],
  not_done: ['×', 'tried'],
};

function studentsFor(group) {
  return db
    .getUsers()
    .filter((u) => u.role === 'student' && (mid.MID_GROUPS.includes(u.group) || u.group === 'TEST'))
    .filter((u) => !group || u.group === group)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

// Матрица: по каждому студенту — статус каждого задания, сколько сдано и сумма баллов.
function overview({ group, q } = {}) {
  const needle = (q || '').trim().toLowerCase();
  const students = studentsFor(group).filter(
    (s) => !needle || s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle)
  );
  const byPair = new Map(db.getAllMidProgress().map((r) => [`${r.student_id}::${r.task_id}`, r]));
  const rows = students.map((s) => {
    const cells = mid.TASKS.map((t) => {
      // Терминальные задания (блок A) — прогресс в ib_lab_tasks (Lab-движок).
      if (t.labTask) {
        const lab = db.getLabTaskForStudent(t.labTask, s.id);
        const status = lab && lab.solved ? 'done' : lab && lab.passed > 0 ? 'in_progress' : 'not_started';
        return { task: t, status, statusKey: STATUS_KEY[status] || 'not_submitted', cell: CELL[status] || CELL.not_started, score: null, runs: 0 };
      }
      const r = byPair.get(`${s.id}::${t.id}`) || null;
      const status = r ? r.status : 'not_started';
      return {
        task: t,
        status,
        statusKey: STATUS_KEY[status] || 'not_submitted',
        cell: CELL[status] || CELL.not_started,
        score: r && typeof r.score === 'number' ? r.score : null,
        runs: r ? r.runs : 0,
      };
    });
    const submitted = cells.filter((c) => ['submitted', 'done', 'not_done'].includes(c.status)).length;
    const done = cells.filter((c) => c.status === 'done').length;
    const graded = cells.some((c) => c.score !== null);
    const score = cells.reduce((sum, c) => sum + (c.score || 0), 0);
    return { student: s, cells, submitted, done, graded, score };
  });
  return {
    blocks: mid.BLOCKS,
    tasks: mid.TASKS,
    total: mid.TOTAL_TASKS,
    rows,
    groups: mid.MID_GROUPS,
    window: mid.windowState(),
    submittedStudents: rows.filter((r) => r.submitted > 0).length,
  };
}

// Карточка одного студента: его работы по блокам с кодом/ответом и результатом проверки.
function studentDetail(studentId) {
  const student = db.getUserById(studentId);
  if (!student || student.role !== 'student') return null;
  const byId = new Map(db.getMidProgress(studentId).map((r) => [r.task_id, r]));
  const blocks = mid.BLOCKS.map((b) => ({
    key: b.key,
    title: b.title,
    desc: b.desc,
    tasks: b.tasks.map((t) => {
      if (t.labTask) {
        const lab = db.getLabTaskForStudent(t.labTask, studentId);
        const status = lab && lab.solved ? 'done' : lab && lab.passed > 0 ? 'in_progress' : 'not_started';
        return {
          ...t, row: null, status, statusKey: STATUS_KEY[status] || 'not_submitted', score: null,
          labProgress: { passed: lab ? lab.passed : 0, total: lab ? lab.total || mid.findMidTask(t.id).stages || 4 : 4 },
        };
      }
      const r = byId.get(t.id) || null;
      const status = r ? r.status : 'not_started';
      return {
        ...t,
        row: r,
        status,
        statusKey: STATUS_KEY[status] || 'not_submitted',
        score: r && typeof r.score === 'number' ? r.score : null,
      };
    }),
  }));
  const all = [...byId.values()];
  return {
    student,
    blocks,
    total: mid.TOTAL_TASKS,
    submitted: all.filter((r) => ['submitted', 'done', 'not_done'].includes(r.status)).length,
    score: all.reduce((s, r) => s + (typeof r.score === 'number' ? r.score : 0), 0),
  };
}

module.exports = { overview, studentDetail, STATUS_KEY };
