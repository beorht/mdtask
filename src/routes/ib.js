// "Информационная безопасность": subject page with the task list, a page per task with the
// web terminal, and the terminal's API — forwarded to IBEmulator's backend (ib/server) via
// src/lib/ib-bridge.js. The terminal page itself is IBEmulator's ib/prototype/terminal-lab.html.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { callTerminal } = require('../lib/ib-bridge');
const { renderMarkdown, extractHeadings } = require('../lib/markdown');
const { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, findIbTask, ibSummary } = require('../lib/ib-tasks');
const detector = require('../lib/ib-detector');
const guardLib = require('../lib/ib-guard');
const siteDefense = require('../lib/ib-defense');
const db = require('../db');
const { blockDuringExam } = require('../middleware/exam-lock');
const { examLockFor } = require('../lib/exam');

const TERMINAL_HTML = path.join(__dirname, '..', '..', 'ib', 'prototype', 'terminal-lab.html');
const API_PATHS = ['login', 'run', 'logout', 'whoami', 'complete'];
const MAX_CODE = 20000;

const router = express.Router();

function subjectSidebar(user) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: IB_SUBJECT_KEY });
}

// The task from :task, with the student's status — or a 404 if it doesn't exist / isn't assigned.
function loadTask(req, res, next) {
  const task = findIbTask(req.params.task);
  if (task && examLockFor(req.session.user)) return blockDuringExam(req, res, next);
  if (!task) return res.status(404).render('404');
  const status = task.status(req.session.user.id);
  if (!status.assigned) return res.status(404).render('404');
  req.ibTask = { ...task, ...status };
  next();
}

// Guarded tasks: the page config for public/js/ib-guard.js (src/lib/ib-guard.js).
function guardConfig(task, user) {
  return guardLib.config(task, user.id);
}

function inlineJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
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
    examLock: examLockFor(user),
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
    guard: guardConfig(req.ibTask, user),
    detectorState: req.ibTask.detector ? db.getLogsDetector(user.id) : null,
    defense: siteDefense.stateFor(req.ibTask, user.id),
    defenseSeconds: siteDefense.SECONDS,
  });
});

// Control questions after a solved task without the stage engine (№3, №4): one at a time, 60 seconds.
router.post(`/subjects/${IB_SUBJECT_KEY}/:task/defense`, requireRole('student'), loadTask, (req, res) => {
  const user = req.session.user;
  if (!siteDefense.supported(req.ibTask.key)) return res.status(404).render('404');
  if (req.body && req.body.action === 'start') siteDefense.start(req.ibTask, user.id);
  else if (req.body && req.body.choice !== undefined) siteDefense.answer(req.ibTask, user.id, req.body.choice);
  res.redirect(`/subjects/${IB_SUBJECT_KEY}/${req.ibTask.key}#defense`);
});

// Theory before practice (tasks that have it): the Markdown from ib/, rendered like assignments.
router.get(`/subjects/${IB_SUBJECT_KEY}/:task/theory`, requireRole('student'), loadTask, (req, res) => {
  const user = req.session.user;
  const task = req.ibTask;
  if (!task.theory) return res.status(404).render('404');
  const md = fs.readFileSync(task.theory, 'utf-8');
  res.render('ib-theory', {
    user,
    sidebarTree: subjectSidebar(user),
    activeAssignmentId: null,
    activePath: `/subjects/${IB_SUBJECT_KEY}/${task.key}/theory`,
    subjectTitle: IB_SUBJECT_TITLE,
    task,
    html: renderMarkdown(md),
    toc: extractHeadings(md).filter((h) => h.level === 2),
  });
});

// The terminal page, one to one with IBEmulator; only its API base URL is set for this task.
router.get('/ib/:task/terminal', requireRole('student'), loadTask, (req, res) => {
  const api = `/ib/${req.ibTask.key}/api`;
  const guard = guardConfig(req.ibTask, req.session.user);
  const guardTags = guard
    ? `\n<script>window.IB_GUARD = ${inlineJson(guard)};</script>\n<script src="/js/ib-guard.js" defer></script>`
    : '';
  const html = fs
    .readFileSync(TERMINAL_HTML, 'utf-8')
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<script>window.SECLAB_API = ${JSON.stringify(api)};</script>${guardTags}`);
  res.type('html').send(html);
});

// Blocked pastes, copies and leaving the page on guarded tasks (public/js/ib-guard.js).
router.post('/ib/:task/guard', requireRole('student'), loadTask, (req, res) => {
  if (!req.ibTask.guard) return res.status(404).json({});
  const events = (Array.isArray(req.body && req.body.events) ? req.body.events : [])
    .slice(0, 50)
    .filter((e) => e && guardLib.GUARD_TYPES.includes(e.type))
    .map((e) => ({ type: e.type, data: e.data && typeof e.data === 'object' ? e.data : {} }));
  if (events.length) db.addIbGuardEvents(req.ibTask.key, req.session.user.id, events);
  res.json({ ok: true });
});

// ---------------------------------------------------- №8, этап 7: детектор ---

function loadDetector(req, res, next) {
  if (!req.ibTask.detector) return res.status(404).render('404');
  next();
}

router.get(`/subjects/${IB_SUBJECT_KEY}/:task/detector`, requireRole('student'), loadTask, loadDetector, (req, res) => {
  const user = req.session.user;
  const row = db.getLogsDetector(user.id);
  const tests = detector.publicTests(user.id);
  res.render('ib-detector', {
    user,
    sidebarTree: subjectSidebar(user),
    activeAssignmentId: null,
    activePath: `/subjects/${IB_SUBJECT_KEY}/${req.ibTask.key}`,
    subjectTitle: IB_SUBJECT_TITLE,
    task: req.ibTask,
    row,
    tests,
    examples: tests.slice(0, detector.OPEN_TESTS),
    rules: detector,
    guard: guardConfig(req.ibTask, user),
    base: `/subjects/${IB_SUBJECT_KEY}/${req.ibTask.key}/detector`,
  });
});

function codeOf(req) {
  const code = req.body && typeof req.body.code === 'string' ? req.body.code : '';
  return code.length > MAX_CODE ? null : code;
}

router.post(`/subjects/${IB_SUBJECT_KEY}/:task/detector/draft`, requireRole('student'), loadTask, loadDetector, (req, res) => {
  const code = codeOf(req);
  if (code === null) return res.status(413).json({ error: 'Слишком длинная программа.' });
  db.saveLogsDetectorDraft(req.session.user.id, code);
  res.json({ saved: true });
});

router.post(`/subjects/${IB_SUBJECT_KEY}/:task/detector/check`, requireRole('student'), loadTask, loadDetector, (req, res) => {
  const code = codeOf(req);
  if (code === null) return res.status(413).json({ error: 'Слишком длинная программа.' });
  let check;
  try {
    check = detector.checkRuns(req.session.user.id, req.body && req.body.runs);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  db.saveLogsDetectorCheck(req.session.user.id, { code, passed: check.passed, total: check.total, solved: check.solved });
  const row = db.getLogsDetector(req.session.user.id);
  res.json({ ...check, solved: !!row.solved, defense: row.defense_ok === null ? null : !!row.defense_ok });
});

// The control question: once, after all tests pass. The log and the expected output stay in the session.
router.post(`/subjects/${IB_SUBJECT_KEY}/:task/detector/challenge`, requireRole('student'), loadTask, loadDetector, (req, res) => {
  const row = db.getLogsDetector(req.session.user.id);
  if (!row || !row.solved) return res.status(409).json({ error: 'Сначала пройдите все тесты.' });
  if (row.defense_ok !== null) return res.status(409).json({ error: 'Контрольный вопрос уже пройден.' });
  if (!req.session.ibDetectorChallenge) req.session.ibDetectorChallenge = detector.challenge();
  const ch = req.session.ibDetectorChallenge;
  const left = Math.max(0, Math.round(detector.DEFENSE_SECONDS - (Date.now() - ch.issuedAt) / 1000));
  res.json({ input: ch.input.join('\n'), seconds: left });
});

router.post(`/subjects/${IB_SUBJECT_KEY}/:task/detector/defense`, requireRole('student'), loadTask, loadDetector, (req, res) => {
  const ch = req.session.ibDetectorChallenge;
  const row = db.getLogsDetector(req.session.user.id);
  if (!ch || !row || !row.solved || row.defense_ok !== null) return res.status(409).json({ error: 'Вопрос не выдан.' });
  const answer = String((req.body && req.body.answer) || '').slice(0, 2000);
  const result = detector.checkDefense(ch, answer);
  db.saveLogsDetectorDefense(req.session.user.id, result.ok, answer);
  delete req.session.ibDetectorChallenge;
  res.json(result);
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
    // The terminal backend serves several tasks; the task picks the sandbox at login.
    const body = action === 'login' ? { ...(req.body || {}), task: key } : req.body || {};
    if (action === 'run') guardLib.checkCommand(req.ibTask, user.id, body.cmd);
    const result = await callTerminal(`/api/${action}`, body, sessions[key]);
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
