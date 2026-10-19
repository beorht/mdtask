// «Простое программирование на Python» (src/lib/python-basics.js): subject page and task pages
// (theory + statement on the left, editor and checking on the right). Mounted before
// studentRoutes, whose /subjects/:key would otherwise answer /subjects/pybasics.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { renderMarkdown } = require('../lib/markdown');
const { savePythonBasicsDraft, recordPythonBasicsAttempt } = require('../db');
const { publicTests, checkRuns } = require('../lib/python-basics-check');
const {
  PYBASICS_KEY,
  PYBASICS_TITLE,
  PYBASICS_TOPIC,
  canSeePythonBasics,
  tasksForStudent,
  summaryForStudent,
} = require('../lib/python-basics');

const MAX_CODE = 20000;
const BASE = `/subjects/${PYBASICS_KEY}`;
const router = express.Router();

// Not opened to the student's group yet: the subject doesn't exist for them.
function requireVisible(req, res, next) {
  if (!canSeePythonBasics(req.session.user)) return res.status(404).render('404');
  next();
}

function sidebar(user) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: PYBASICS_KEY });
}

// The task the URL names, if it's open for the student (JSON routes answer with an error).
function findTask(req, res, json) {
  const tasks = tasksForStudent(req.session.user);
  const index = tasks.findIndex((t) => t.id === req.params.id);
  const task = tasks[index];
  if (!task || !task.unlocked) {
    if (json) res.status(task ? 403 : 404).json({ error: task ? 'Avval oldingi topshiriqni bajaring.' : 'Bunday topshiriq yo‘q.' });
    else res.status(404).render('404');
    return null;
  }
  return { task, tasks, index };
}

function readCode(req, res) {
  const code = req.body && req.body.code;
  if (typeof code !== 'string' || code.length > MAX_CODE) {
    res.status(400).json({ error: `Kod kelmadi yoki ${MAX_CODE} belgidan uzun.` });
    return null;
  }
  return code;
}

router.get(BASE, requireRole('student'), requireVisible, (req, res) => {
  const user = req.session.user;
  res.render('pybasics/index', {
    user,
    sidebarTree: sidebar(user),
    activeAssignmentId: null,
    activePath: BASE,
    title: PYBASICS_TITLE,
    topic: PYBASICS_TOPIC,
    summary: summaryForStudent(user),
  });
});

router.get(`${BASE}/:id`, requireRole('student'), requireVisible, (req, res) => {
  const found = findTask(req, res, false);
  if (!found) return;
  const { task, tasks, index } = found;
  const user = req.session.user;
  res.render('pybasics/task', {
    user,
    sidebarTree: sidebar(user),
    activeAssignmentId: null,
    activePath: `${BASE}/${task.id}`,
    base: BASE,
    title: PYBASICS_TITLE,
    topic: PYBASICS_TOPIC,
    task,
    theoryHtml: renderMarkdown(task.theoryMd),
    taskHtml: renderMarkdown(task.taskMd),
    examples: task.tests.slice(0, task.openTests),
    tests: publicTests(task),
    code: task.progress ? task.progress.draft : '',
    total: tasks.length,
    next: tasks[index + 1] || null,
  });
});

router.post(`${BASE}/:id/draft`, requireRole('student'), requireVisible, (req, res) => {
  const found = findTask(req, res, true);
  if (!found) return;
  const code = readCode(req, res);
  if (code === null) return;
  res.json({ savedAt: savePythonBasicsDraft(req.session.user.id, found.task.id, code) });
});

// Body: { code, runs: [{ stdout, error, timeout }] } — one run per test, in test order.
router.post(`${BASE}/:id/check`, requireRole('student'), requireVisible, (req, res) => {
  const found = findTask(req, res, true);
  if (!found) return;
  const code = readCode(req, res);
  if (code === null) return;
  let check;
  try {
    check = checkRuns(found.task, req.body.runs);
  } catch (err) {
    return res.status(400).json({ error: `Tekshiruv bajarilmadi: ${err.message}.` });
  }
  recordPythonBasicsAttempt(req.session.user.id, found.task.id, code, check);
  const next = found.tasks[found.index + 1];
  res.json({ ...check, next: check.solved && next ? { id: next.id, title: next.title, href: `${BASE}/${next.id}` } : null });
});

module.exports = router;
