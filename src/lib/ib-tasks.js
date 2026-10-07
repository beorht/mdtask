// "Информационная безопасность" subject: practical tasks solved in the web terminal (ib/,
// ported from IBEmulator). Each task has its own terminal page; a task is assigned to a
// student once the teacher has generated it for them (its status row exists).
const { getCaesarSecretForStudent } = require('../db');

const IB_SUBJECT_KEY = 'ib';
const IB_SUBJECT_TITLE = 'Информационная безопасность';

const IB_TASKS = [
  {
    key: 'caesar',
    number: 3,
    title: 'Доступ к защищённой базе данных',
    summary:
      'В домашнем каталоге лежит резервная копия базы компании, защищённая паролем. Найдите спрятанный файл, ' +
      'расшифруйте шифр Цезаря и откройте базу командой sqlite3.',
    skills: ['Linux-терминал', 'Шифр Цезаря', 'SQLite'],
    status(studentId) {
      const row = getCaesarSecretForStudent(studentId);
      return { assigned: !!row, solved: !!(row && row.solved), solvedAt: row ? row.solved_at : null };
    },
  },
];

function findIbTask(key) {
  return IB_TASKS.find((t) => t.key === key) || null;
}

// Tasks with this student's status, in course order.
function ibTasksForUser(user) {
  return IB_TASKS.map((task) => ({ ...task, ...task.status(user.id) }));
}

function ibSummary(user) {
  const tasks = ibTasksForUser(user);
  const assigned = tasks.filter((t) => t.assigned);
  return {
    tasks,
    total: assigned.length,
    solved: assigned.filter((t) => t.solved).length,
    next: assigned.find((t) => !t.solved) || null,
  };
}

module.exports = { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, IB_TASKS, findIbTask, ibTasksForUser, ibSummary };
