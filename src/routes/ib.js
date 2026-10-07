// "Информационная безопасность": subject page with the task list, a page per task with the
// web terminal, and the terminal's API — forwarded to IBEmulator's backend (ib/server) via
// src/lib/ib-bridge.js. The terminal page itself is IBEmulator's ib/prototype/terminal-lab.html.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { callTerminal } = require('../lib/ib-bridge');
const { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, findIbTask, ibSummary } = require('../lib/ib-tasks');

const TERMINAL_HTML = path.join(__dirname, '..', '..', 'ib', 'prototype', 'terminal-lab.html');
const API_PATHS = ['login', 'run', 'logout', 'whoami'];

const router = express.Router();

function subjectSidebar(user) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: IB_SUBJECT_KEY });
}

// The task from :task, with the student's status — or a 404 if it doesn't exist / isn't assigned.
function loadTask(req, res, next) {
  const task = findIbTask(req.params.task);
  if (!task) return res.status(404).render('404');
  const status = task.status(req.session.user.id);
  if (!status.assigned) return res.status(404).render('404');
  req.ibTask = { ...task, ...status };
  next();
}

router.get(`/subjects/${IB_SUBJECT_KEY}`, requireRole('student'), (req, res) => {
  const user = req.session.user;
  res.render('subject-ib', {
    user,
    sidebarTree: subjectSidebar(user),
    activeAssignmentId: null,
    activePath: `/subjects/${IB_SUBJECT_KEY}`,
    title: IB_SUBJECT_TITLE,
    ib: ibSummary(user),
  });
});

router.get(`/subjects/${IB_SUBJECT_KEY}/:task`, requireRole('student'), loadTask, (req, res) => {
  const user = req.session.user;
  res.render('ib-task', {
    user,
    sidebarTree: subjectSidebar(user),
    activeAssignmentId: null,
    activePath: `/subjects/${IB_SUBJECT_KEY}/${req.ibTask.key}`,
    subjectTitle: IB_SUBJECT_TITLE,
    task: req.ibTask,
  });
});

// The terminal page, one to one with IBEmulator; only its API base URL is set for this task.
router.get('/ib/:task/terminal', requireRole('student'), loadTask, (req, res) => {
  const api = `/ib/${req.ibTask.key}/api`;
  const html = fs
    .readFileSync(TERMINAL_HTML, 'utf-8')
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<script>window.SECLAB_API = ${JSON.stringify(api)};</script>`);
  res.type('html').send(html);
});

// Terminal API. The TTY login is kept as in IBEmulator (the student's own mdtask password),
// but only for the logged-in student — the terminal session id stays in the mdtask session.
router.post('/ib/:task/api/:action', requireRole('student'), loadTask, async (req, res) => {
  const action = req.params.action;
  if (!API_PATHS.includes(action)) return res.status(404).json({});
  const user = req.session.user;
  const sessions = req.session.ibTerminal || (req.session.ibTerminal = {});
  const key = req.ibTask.key;

  if (action === 'login' && String((req.body && req.body.studentId) || '').trim() !== user.id) {
    return res.json({ ok: false, error: 'Неверный логин или пароль' });
  }

  // A failed backend answers with plain text: the page can't parse it and shows
  // "Ошибка соединения с сервером", as with a dropped connection in IBEmulator.
  try {
    const result = await callTerminal(`/api/${action}`, req.body || {}, sessions[key]);
    if (result.sid) sessions[key] = result.sid;
    else if (result.sid === '' || result.status === 401) delete sessions[key];
    if (result.status >= 500) return res.status(result.status).type('text').send(result.body.error || 'error');
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(502).type('text').send(err.message);
  }
});

// The old single-page terminal lived here.
router.get('/ctf/caesar', (req, res) => res.redirect(`/subjects/${IB_SUBJECT_KEY}/caesar`));

module.exports = router;
