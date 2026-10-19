// «Простое программирование на Python»: short tasks with theory, an in-browser editor and
// automatic checking (src/lib/python-basics-check.js). Task data: content/pybasics/tasks.json,
// theory and statement per task: content/pybasics/<dir>/theory.md and task.md. Reference
// solutions (server/teacher only): scripts/python-basics/solutions/<id>.py.
const fs = require('fs');
const path = require('path');
const { hasFullAccess } = require('./test-access');
const { getPythonBasicsProgress } = require('../db');

const PYBASICS_KEY = 'pybasics';
// The course is in Uzbek (Latin script): theory, statements, pages and check messages.
const PYBASICS_TITLE = 'Python’da oddiy dasturlash';
const PYBASICS_TOPIC = 'O‘zgaruvchilar va ma’lumot turlari';
const PYBASICS_ICON = '🐣';

// Groups that see the subject (besides TEST). To open it to another group, add it here and
// restart the server.
const PYBASICS_GROUPS = ['PRAK'];

const DIR = path.join(__dirname, '..', '..', 'content', 'pybasics');

function loadTasks() {
  const { tasks } = JSON.parse(fs.readFileSync(path.join(DIR, 'tasks.json'), 'utf-8'));
  return tasks.map((t) => ({
    ...t,
    theoryMd: fs.readFileSync(path.join(DIR, t.dir, 'theory.md'), 'utf-8'),
    taskMd: fs.readFileSync(path.join(DIR, t.dir, 'task.md'), 'utf-8'),
  }));
}

const TASKS = loadTasks();

function getTask(id) {
  return TASKS.find((t) => t.id === id) || null;
}

function canSeePythonBasics(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || PYBASICS_GROUPS.includes(user.group));
}

// Tasks with the student's progress; a task opens once the previous one is solved (TEST: all open).
function tasksForStudent(user) {
  const progress = new Map(getPythonBasicsProgress(user.id).map((p) => [p.taskId, p]));
  let prevSolved = true;
  return TASKS.map((t) => {
    const p = progress.get(t.id) || null;
    const solved = !!(p && p.solvedAt);
    const unlocked = prevSolved || hasFullAccess(user);
    prevSolved = prevSolved && solved;
    return { ...t, progress: p, solved, unlocked, status: solved ? 'done' : !unlocked ? 'locked' : p && p.attempts ? 'current' : 'open' };
  });
}

function summaryForStudent(user) {
  const tasks = tasksForStudent(user);
  return {
    tasks,
    total: tasks.length,
    solved: tasks.filter((t) => t.solved).length,
    next: tasks.find((t) => t.unlocked && !t.solved) || null,
  };
}

module.exports = {
  PYBASICS_KEY,
  PYBASICS_TITLE,
  PYBASICS_TOPIC,
  PYBASICS_ICON,
  PYBASICS_GROUPS,
  TASKS,
  getTask,
  canSeePythonBasics,
  tasksForStudent,
  summaryForStudent,
};
