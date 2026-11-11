// Студенческая страница средней контрольной ИБ (/exam/ib-mid-1). Доступ — группа ИБ или TEST,
// внутри окна (TEST — всегда). Пока блоки наполняются, задания показываются как «готовится».
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const mid = require('../lib/ib-mid');
const db = require('../db');
const { callTerminal } = require('../lib/ib-bridge');
const guardLib = require('../lib/ib-guard');
const { heavyLimiter } = require('../lib/rate-limit');
const blockB = require('../lib/ib-mid/block-b');
const blockC = require('../lib/ib-mid/block-c');
const blockD = require('../lib/ib-mid/block-d');
// Задачи с Python-редактором и проверкой вывода на двух наборах (блоки B и D).
function pyModule(taskId) {
  if (blockB.isBlockBTask(taskId)) return blockB;
  if (blockD.isBlockDTask(taskId)) return blockD;
  return null;
}
const { renderMarkdown } = require('../lib/markdown');

const router = express.Router();

// Блок A — терминальная Lab-задача «midterm-a» (ib/server/midterm_a_task.py), подаётся тем же
// IB-терминалом, что и остальные задания ИБ, но под гейтом окна ИБ-контрольной.
const TERMINAL_HTML = path.join(__dirname, '..', '..', 'ib', 'prototype', 'terminal-lab.html');
const API_PATHS = ['login', 'run', 'logout', 'whoami', 'complete'];
const BLOCK_A_TASK = { key: 'midterm-a', guard: true, clipHint: 'Выполняйте задание в этом терминале.' };

function fmt(iso) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function inlineJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

router.get('/exam/ib-mid-1', requireAuth, (req, res) => {
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).render('404');
  const win = mid.windowState();
  const open = mid.isOpenFor(user);
  const byId = new Map(db.getMidProgress(user.id).map((r) => [r.task_id, r]));
  const blocks = mid.BLOCKS.map((b) => ({
    key: b.key,
    title: b.title,
    desc: b.desc,
    tasks: b.tasks.map((t) => {
      // Терминальные задания (блок A) хранят прогресс в ib_lab_tasks (Lab-движок), не в ib_mid_progress.
      if (t.labTask) {
        const lab = db.getLabTaskForStudent(t.labTask, user.id);
        const status = lab && lab.solved ? 'done' : lab && lab.passed > 0 ? 'in_progress' : 'not_started';
        return { ...t, status, locked: false };
      }
      const r = byId.get(t.id) || null;
      return { ...t, status: r ? r.status : 'not_started', locked: r ? r.locked : false };
    }),
  }));
  res.render('ib-mid/index', {
    user,
    pageTitle: mid.MID_TITLE,
    title: mid.MID_TITLE,
    open,
    window: win,
    windowText: win.scheduled ? { start: fmt(win.startsAt), end: fmt(win.endsAt) } : null,
    blocks,
  });
});

// --- Блок B: задачи Python + sqlite3 ---

function pyGate(req, res) {
  const user = req.session.user;
  if (!mid.hasAccess(user) || !pyModule(req.params.task)) { res.status(404).render('404'); return null; }
  return user;
}

router.get('/exam/ib-mid-1/:task', requireAuth, (req, res, next) => {
  const mod = pyModule(req.params.task);
  if (!mod) return next();
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).render('404');
  if (!mid.isOpenFor(user)) return res.redirect('/exam/ib-mid-1');
  const v = mod.view(user.id, req.params.task);
  const row = db.getMidTask(user.id, req.params.task);
  res.render('ib-mid/python-task', {
    user,
    pageTitle: `${v.title} · ${mid.MID_TITLE}`,
    midTitle: mid.MID_TITLE,
    title: v.title,
    taskId: v.id,
    statementHtml: renderMarkdown(v.statement),
    datasetsAttr: JSON.stringify(v.datasets),
    datafile: v.datafile || 'data.sql',
    draft: row && row.draft ? row.draft : '',
    solved: !!(row && row.status === 'done'),
  });
});

router.post('/exam/ib-mid-1/:task/draft', requireAuth, (req, res, next) => {
  if (!pyModule(req.params.task)) return next();
  const user = pyGate(req, res);
  if (!user) return undefined;
  if (!mid.isOpenFor(user)) return res.status(423).json({ error: 'Контрольная закрыта.' });
  const draft = typeof (req.body && req.body.draft) === 'string' ? req.body.draft.slice(0, 20000) : '';
  db.saveMidDraft(user.id, req.params.task, { draft });
  return res.json({ saved: true });
});

router.post('/exam/ib-mid-1/:task/check', requireAuth, (req, res, next) => {
  const mod = pyModule(req.params.task);
  if (!mod) return next();
  const user = pyGate(req, res);
  if (!user) return undefined;
  if (!mid.isOpenFor(user)) return res.status(423).json({ error: 'Контрольная закрыта.' });
  const outputs = (req.body && Array.isArray(req.body.outputs) ? req.body.outputs : []).map((s) => String(s || '').slice(0, 20000));
  const result = mod.check(user.id, req.params.task, outputs);
  db.recordMidCheck(user.id, req.params.task, {
    status: result.solved ? 'done' : 'in_progress',
    draft: typeof (req.body && req.body.draft) === 'string' ? req.body.draft.slice(0, 20000) : null,
    result: { solved: result.solved, at: new Date().toISOString() },
  });
  return res.json({ solved: result.solved, hint: result.hint });
});

// --- Блок C: поиск и исправление ошибок (4 запуска → авто-сдача, вердикт скрыт) ---

router.get('/exam/ib-mid-1/:task', requireAuth, (req, res, next) => {
  if (!blockC.isBlockCTask(req.params.task)) return next();
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).render('404');
  if (!mid.isOpenFor(user)) return res.redirect('/exam/ib-mid-1');
  const v = blockC.view(req.params.task);
  const row = db.getMidTask(user.id, req.params.task);
  res.render('ib-mid/bugfix-task', {
    user,
    pageTitle: `${v.title} · ${mid.MID_TITLE}`,
    midTitle: mid.MID_TITLE,
    title: v.title,
    taskId: v.id,
    descriptionHtml: renderMarkdown(v.description),
    starter: row && row.draft ? row.draft : v.starter,
    testsAttr: JSON.stringify(v.tests),
    runsUsed: row ? row.runs : 0,
    runsLimit: v.runsLimit,
    locked: !!(row && row.locked),
  });
});

function blockCRun(req, res, final) {
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).json({});
  if (!mid.isOpenFor(user)) return res.status(423).json({ error: 'Контрольная закрыта.' });
  const taskId = req.params.task;
  const existing = db.getMidTask(user.id, taskId);
  if (existing && existing.locked) return res.json({ locked: true, runsUsed: existing.runs, runsLeft: 0 });
  const outputs = (req.body && Array.isArray(req.body.outputs) ? req.body.outputs : []).map((s) => String(s || '').slice(0, 20000));
  const draft = typeof (req.body && req.body.draft) === 'string' ? req.body.draft.slice(0, 20000) : null;
  const g = blockC.grade(taskId, outputs);
  // runs: при «Запустить» увеличиваем счётчик; при явной «Отправить» — используем текущий.
  const runs = final ? (existing ? existing.runs : 0) : db.bumpMidRuns(user.id, taskId);
  const atLimit = final || runs >= blockC.RUNS_LIMIT;
  const result = { pass: g.pass, total: g.total, solved: g.solved, runs, at: new Date().toISOString() };
  if (atLimit) db.submitMidTask(user.id, taskId, { status: g.solved ? 'done' : 'not_done', draft, result });
  else db.recordMidCheck(user.id, taskId, { status: 'in_progress', draft, result });
  return res.json({ runsUsed: runs, runsLeft: Math.max(0, blockC.RUNS_LIMIT - runs), locked: atLimit });
}

router.post('/exam/ib-mid-1/:task/run', requireAuth, (req, res, next) => {
  if (!blockC.isBlockCTask(req.params.task)) return next();
  return blockCRun(req, res, false);
});

router.post('/exam/ib-mid-1/:task/submit', requireAuth, (req, res, next) => {
  if (!blockC.isBlockCTask(req.params.task)) return next();
  return blockCRun(req, res, true);
});

// --- Блок A: терминал ---

// Страница терминала блока A (один в один IB-терминал; задаётся только адрес API и guard).
router.get('/exam/ib-mid-1/a-ops/terminal', requireAuth, (req, res) => {
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).render('404');
  if (!mid.isOpenFor(user)) return res.redirect('/exam/ib-mid-1');
  const api = '/exam/ib-mid-1/a-ops/api';
  const g = guardLib.config(BLOCK_A_TASK, user.id);
  if (g) g.log = '/exam/ib-mid-1/a-ops/guard';
  const guardTags = g
    ? `\n<script>window.IB_GUARD = ${inlineJson(g)};</script>\n<script src="/js/ib-guard.js" defer></script>`
    : '';
  const html = fs
    .readFileSync(TERMINAL_HTML, 'utf-8')
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<script>window.SECLAB_API = ${JSON.stringify(api)};</script>${guardTags}`);
  res.type('html').send(html);
});

// Журнал guard-событий (вставки/копирование/уход со страницы) блока A.
router.post('/exam/ib-mid-1/a-ops/guard', requireAuth, (req, res) => {
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).json({});
  const events = (Array.isArray(req.body && req.body.events) ? req.body.events : [])
    .slice(0, 50)
    .filter((e) => e && guardLib.GUARD_TYPES.includes(e.type))
    .map((e) => ({ type: e.type, data: e.data && typeof e.data === 'object' ? e.data : {} }));
  if (events.length) db.addIbGuardEvents('midterm-a', user.id, events);
  res.json({ ok: true });
});

// API терминала блока A → мост ib/server (вход выбирает песочницу midterm-a по ключу задания).
router.post('/exam/ib-mid-1/a-ops/api/:action', requireAuth, heavyLimiter, async (req, res) => {
  const action = req.params.action;
  if (!API_PATHS.includes(action)) return res.status(404).json({});
  const user = req.session.user;
  if (!mid.hasAccess(user)) return res.status(404).json({});
  if (!mid.isOpenFor(user)) return res.status(423).json({ error: 'Контрольная сейчас закрыта.' });
  const sessions = req.session.ibMidTerminal || (req.session.ibMidTerminal = {});
  const key = 'midterm-a';
  if (action === 'login' && String((req.body && req.body.studentId) || '').trim() !== user.id) {
    return res.json({ ok: false, error: 'Неверный логин или пароль' });
  }
  try {
    const body = action === 'login' ? { ...(req.body || {}), task: key } : req.body || {};
    if (action === 'run') guardLib.checkCommand(BLOCK_A_TASK, user.id, body.cmd);
    const result = await callTerminal(`/api/${action}`, body, sessions[key]);
    if (result.sid) sessions[key] = result.sid;
    else if (result.sid === '' || result.status === 401) delete sessions[key];
    if (result.status >= 500) return res.status(result.status).type('text').send(result.body.error || 'error');
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(502).type('text').send(err.message);
  }
});

module.exports = router;
