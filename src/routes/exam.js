// Итоговая контрольная (src/lib/exam): pages and API for the student. Every action is written to
// the student's own log file (src/lib/exam/log.js). The terminal of stages 1, 2 and 5 is the IB
// terminal (ib/server) on the student's exam sandbox, proxied through here so each command is
// logged. Programs run in the student's browser; the server only compares what they printed.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { requireRole } = require('../middleware/auth');
const db = require('../db');
const { callTerminal } = require('../lib/ib-bridge');
const { renderMarkdown } = require('../lib/markdown');
const { normalize, publicTests } = require('../lib/python-basics-check');
const examLib = require('../lib/exam');
const { logEvent, saveSnapshot } = require('../lib/exam/log');
const { MAX_RUNS } = require('../lib/exam/bugs');
const examSql = require('../lib/exam/sql');
const { checkDevice } = require('../lib/exam/devices');

const router = express.Router();

const TERMINAL_HTML = path.join(__dirname, '..', '..', 'ib', 'prototype', 'terminal-lab.html');
const FORBIDDEN_PY = path.join(__dirname, '..', 'lib', 'exam', 'forbidden.py');
const PYTHON = process.env.IB_PYTHON || 'python3';
const TERMINAL_ACTIONS = ['login', 'run', 'logout', 'whoami', 'complete'];
// Bug programs may still be sent by the page's own timer this long after the end.
const SUBMIT_GRACE_MS = 2 * 60 * 1000;
const MAX_CODE = 20000;
const MAX_OUTPUT = 20000;
const MAX_SQL = 5000;
const MAX_ANSWER = 300;
const CLIENT_EVENTS = ['page_leave', 'visibility', 'blur', 'focus', 'paste', 'copy', 'idle', 'timer_end', 'terminal_paste', 'device_info'];

// ---------------------------------------------------------------- helpers ---

function base(exam) {
  return `/exam/${exam.id}`;
}

function rowsOf(req) {
  return new Map(db.getExamTasks(req.exam.def.id, req.session.user.id).map((r) => [r.taskId, r]));
}

function log(req, type, fields = {}) {
  try {
    return logEvent(req.exam.def.id, req.session.user.id, { ...fields, type, req });
  } catch (err) {
    console.error('exam log:', err.message);
    return { seq: 0 };
  }
}

function snapshot(req, event, taskId, kind, code) {
  try {
    return saveSnapshot(req.exam.def.id, req.session.user.id, event.seq, taskId, kind, code);
  } catch (err) {
    return null;
  }
}

// Lines changed relative to the given program (for the bug tasks: how much the student touched).
function changedLines(code, original) {
  const a = String(code).split('\n');
  const b = String(original).split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return Math.max(a.length, b.length) - dp[0][0];
}

function codeLineSet(code) {
  return new Set(
    String(code)
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter((l) => l.length > 3)
  );
}

// Share of the lines of `program` that also occur in `code`.
function overlap(code, program) {
  const mine = codeLineSet(code);
  const theirs = codeLineSet(program);
  if (!theirs.size) return 0;
  let common = 0;
  for (const line of theirs) if (mine.has(line)) common += 1;
  return common / theirs.size;
}

function forbiddenIn(code) {
  const proc = spawnSync(PYTHON, ['-I', FORBIDDEN_PY], { input: code, encoding: 'utf-8', timeout: 10000 });
  if (proc.status !== 0) return { syntax: null, found: [], failed: true };
  try {
    return JSON.parse(proc.stdout);
  } catch (err) {
    return { syntax: null, found: [], failed: true };
  }
}

function compareRuns(task, runs) {
  const tests = task.tests.map((test, i) => {
    const run = runs[i] || {};
    const stdout = String(run.stdout || '').slice(0, MAX_OUTPUT);
    const error = run.timeout ? 'превышено время выполнения' : run.error ? String(run.error).slice(0, 300) : null;
    const passed = !error && normalize(stdout) === normalize(test.output);
    const open = i < task.openTests;
    return { number: i + 1, open, passed, error, actual: open ? stdout : undefined, input: open ? test.input : undefined, expected: open ? test.output : undefined };
  });
  const passed = tests.filter((t) => t.passed).length;
  return { tests, passed, total: tests.length, solved: passed === tests.length };
}

function readRuns(req, task) {
  const runs = req.body && req.body.runs;
  if (!Array.isArray(runs) || runs.length !== task.tests.length) return null;
  return runs.map((r) => ({ stdout: String((r && r.stdout) || '').slice(0, MAX_OUTPUT), error: r && r.error ? String(r.error).slice(0, 500) : null, timeout: !!(r && r.timeout) }));
}

function readCode(req, res) {
  const code = req.body && req.body.code;
  if (typeof code !== 'string' || code.length > MAX_CODE) {
    res.status(400).json({ error: `Код не получен или длиннее ${MAX_CODE} символов.` });
    return null;
  }
  return code;
}

// Actions are accepted only while the exam runs; after the end every attempt is logged and refused.
function requireOpen({ grace = false } = {}) {
  return (req, res, next) => {
    const { phase, win } = req.exam;
    if (phase === 'open') return next();
    if (grace && Date.now() < Date.parse(win.endsAt) + SUBMIT_GRACE_MS) return next();
    log(req, 'blocked_action', { task: req.params.taskId || null, data: { path: req.path, reason: 'closed' } });
    return res.status(409).json({ error: 'Контрольная завершена: изменить ответы уже нельзя.' });
  };
}

function loadExam(req, res, next) {
  const def = examLib.getExamDef(req.params.examId);
  const user = req.session.user;
  if (!def) return res.status(404).render('404');
  const variant = db.getExamVariant(def.id, user.id);
  if (!variant) return res.status(404).render('404');
  const win = examLib.examWindow(def);
  if (Date.now() >= Date.parse(win.endsAt) + SUBMIT_GRACE_MS) examLib.finalizeIfDue(def, win);
  const phase = examLib.phaseFor(def, user, win);
  if (phase === 'before') return res.status(404).render('404');
  const tasks = examLib.tasksOf(variant);
  req.exam = { def, win: examLib.examWindow(def), phase, variant, tasks, scenario: examLib.scenarioOf(variant) };
  const userAgent = String(req.get('user-agent') || '').slice(0, 300);
  const seen = req.session.examSessions || (req.session.examSessions = {});
  if (!seen[def.id]) {
    seen[def.id] = true;
    log(req, 'session_start', { data: { userAgent } });
  }
  // Only from the classroom PCs (src/lib/exam/devices.js); every new address is logged.
  const device = checkDevice(req.exam.win, variant, user, req.ip);
  req.exam.device = device;
  const where = req.session.examDevice || (req.session.examDevice = {});
  const key = `${device.ip}|${device.pc || ''}|${device.mac || ''}`;
  if (where[def.id] !== key) {
    log(req, where[def.id] ? 'device_change' : 'device', { data: { ...device, userAgent } });
    where[def.id] = key;
  }
  if (!device.allowed) {
    log(req, 'device_blocked', { data: { ip: device.ip, mac: device.mac, reason: device.reason, path: req.originalUrl, userAgent } });
    const message = 'Контрольная доступна только с компьютеров аудитории.';
    if (req.method !== 'GET') return res.status(403).json({ error: message });
    return res.status(403).render('exam/blocked', { user, exam: def, device });
  }
  next();
}

function taskFrom(req, res, kinds) {
  const task = req.exam.tasks.find((t) => t.id === req.params.taskId);
  if (!task || (kinds && !kinds.includes(task.kind))) {
    if (req.method === 'GET') res.status(404).render('404');
    else res.status(404).json({ error: 'Нет такого задания.' });
    return null;
  }
  return task;
}

// What the student sees about a task: no scores and no verdict on the bug programs.
function taskState(task, row) {
  if (!row) return { state: 'new', label: 'Не начато' };
  if (task.kind === 'bug') {
    if (row.submittedAt) return { state: 'sent', label: 'Отправлено' };
    if (row.runs) return { state: 'work', label: `Запусков: ${row.runs} из ${MAX_RUNS}` };
    return { state: row.draft ? 'work' : 'new', label: row.draft ? 'В работе' : 'Не начато' };
  }
  if (task.kind === 'report') {
    if (row.submittedAt) return { state: 'sent', label: 'Отправлено' };
    return { state: row.draft ? 'work' : 'new', label: row.draft ? 'Черновик' : 'Не начато' };
  }
  if (row.solved) return { state: 'done', label: 'Решено' };
  if (row.attempts) return { state: 'tried', label: `Попыток: ${row.attempts}` };
  return { state: row.draft ? 'work' : 'new', label: row.draft ? 'В работе' : 'Не начато' };
}

const STATE_ICON = { new: '○', work: '✎', tried: '✕', done: '✓', sent: '📨' };

function sidebarOf(req) {
  const { def, tasks } = req.exam;
  const rows = rowsOf(req);
  const link = (t) => {
    const st = taskState(t, rows.get(t.id));
    const href = t.kind === 'algorithm' || t.kind === 'bug' || t.kind === 'sql' ? `${base(def)}/task/${t.id}` : `${base(def)}/stage/${t.stage}#q${t.id}`;
    return { kind: 'link', icon: STATE_ICON[st.state], title: `${t.id}. ${t.title}`, href, children: [] };
  };
  return [
    { kind: 'back', title: 'Все предметы', href: '/', children: [] },
    { kind: 'header', icon: '🎓', title: def.title, href: base(def), sub: 'Обзор контрольной', children: [] },
    {
      kind: 'section',
      title: 'Этапы',
      children: examLib.STAGES.map((s) => {
        const own = tasks.filter((t) => t.stage === s.n);
        if (s.kind === 'code' || s.kind === 'sql') {
          return {
            kind: 'group',
            number: s.n,
            title: s.title,
            status: 'open',
            open: true,
            children: [{ kind: 'link', icon: s.icon, title: 'Описание этапа', href: `${base(def)}/stage/${s.n}`, children: [] }, ...own.map(link)],
          };
        }
        return { kind: 'link', icon: s.icon, title: `${s.n}. ${s.title}`, href: `${base(def)}/stage/${s.n}`, children: [] };
      }),
    },
  ];
}

function common(req, extra) {
  const { def, win, phase, variant, scenario } = req.exam;
  return {
    user: req.session.user,
    sidebarTree: sidebarOf(req),
    activeAssignmentId: null,
    exam: def,
    win,
    phase,
    variant,
    params: scenario.params,
    base: base(def),
    stages: examLib.STAGES,
    ...extra,
  };
}

function pageView(req, task) {
  log(req, 'page_view', { stage: task ? task.stage : req.params.n ? Number(req.params.n) : null, task: task ? task.id : null, data: { path: req.originalUrl } });
}

router.use('/exam/:examId', requireRole('student'), loadExam);

// ------------------------------------------------------------------- pages ---

router.get('/exam/:examId', (req, res) => {
  const { def, tasks } = req.exam;
  const rows = rowsOf(req);
  pageView(req, null);
  const published = !!req.exam.win.publishedAt;
  const score = published ? examLib.scoreTasks(tasks, [...rows.values()]) : null;
  res.render('exam/index', common(req, {
    activePath: base(def),
    pageTitle: def.title,
    stageList: examLib.STAGES.map((s) => ({
      ...s,
      tasks: tasks.filter((t) => t.stage === s.n).map((t) => ({ ...t, ...taskState(t, rows.get(t.id)) })),
    })),
    score,
    grade: score && !score.pending ? examLib.gradeOf(score.total) : null,
  }));
});

router.get('/exam/:examId/stage/:n', (req, res) => {
  const { def, tasks, scenario } = req.exam;
  const stage = examLib.STAGES.find((s) => String(s.n) === req.params.n);
  if (!stage) return res.status(404).render('404');
  const rows = rowsOf(req);
  pageView(req, null);
  const own = tasks.filter((t) => t.stage === stage.n).map((t) => {
    const row = rows.get(t.id) || null;
    return { ...t, ...taskState(t, row), row, textHtml: t.text ? renderMarkdown(t.text) : null };
  });
  let report = null;
  if (stage.kind === 'report') {
    const row = rows.get(examLib.REPORT_TASK);
    let saved = {};
    try {
      saved = row && row.draft ? JSON.parse(row.draft) : {};
    } catch (err) {
      saved = {};
    }
    report = { fields: examLib.REPORT_FIELDS.map((f) => ({ ...f, value: saved[f.key] || '' })), submittedAt: row ? row.submittedAt : null };
  }
  res.render('exam/stage', common(req, {
    activePath: `${base(def)}/stage/${stage.n}`,
    pageTitle: `Этап ${stage.n}. ${stage.title}`,
    stage,
    introHtml: renderMarkdown(examLib.stageIntro(stage.n, scenario.params)),
    stageTasks: own,
    tables: stage.kind === 'sql' ? examSql.tablesOf(scenario.schemaSql) : null,
    report,
    maxRuns: MAX_RUNS,
  }));
});

router.get('/exam/:examId/task/:taskId', (req, res) => {
  const task = taskFrom(req, res, ['algorithm', 'bug', 'sql']);
  if (!task) return;
  const { def, scenario } = req.exam;
  const row = rowsOf(req).get(task.id) || null;
  pageView(req, task);
  const stage = examLib.STAGES.find((s) => s.n === task.stage);
  const view = {
    activePath: `${base(def)}/task/${task.id}`,
    pageTitle: `Задание ${task.id}. ${task.title}`,
    stage,
    task,
    row,
    state: taskState(task, row),
  };
  if (task.kind === 'sql') {
    return res.render('exam/sql', common(req, {
      ...view,
      statementHtml: renderMarkdown(task.statement),
      tables: examSql.tablesOf(scenario.schemaSql),
      sqlText: row ? row.draft || row.answer || '' : '',
    }));
  }
  const isBug = task.kind === 'bug';
  res.render('exam/code', common(req, {
    ...view,
    statementHtml: renderMarkdown(isBug ? task.description : task.statement),
    examples: task.tests.slice(0, task.openTests),
    tests: publicTests(task),
    code: row && row.draft ? row.draft : isBug ? task.starter : '',
    runsLeft: isBug ? MAX_RUNS - (row ? row.runs : 0) : null,
    locked: !!(row && row.locked) || req.exam.phase !== 'open',
    submitted: !!(row && row.submittedAt),
    maxRuns: MAX_RUNS,
  }));
});

// ----------------------------------------------------------------- terminal ---

router.get('/exam/:examId/terminal', (req, res) => {
  const api = `${base(req.exam.def)}/terminal/api`;
  const html = fs
    .readFileSync(TERMINAL_HTML, 'utf-8')
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<script>window.SECLAB_API = ${JSON.stringify(api)}; window.SECLAB_RESUME = true;</script>`);
  res.type('html').send(html);
});

router.post('/exam/:examId/terminal/api/:action', async (req, res) => {
  const action = req.params.action;
  if (!TERMINAL_ACTIONS.includes(action)) return res.status(404).json({});
  if (req.exam.phase !== 'open' && action !== 'whoami' && action !== 'logout') {
    log(req, 'blocked_action', { data: { path: req.path, reason: 'closed' } });
    return res.status(409).type('text').send('closed');
  }
  const user = req.session.user;
  const key = `exam-${req.exam.def.id}`;
  const sessions = req.session.examTerminal || (req.session.examTerminal = {});
  if (action === 'login' && String((req.body && req.body.studentId) || '').trim() !== user.id) {
    log(req, 'terminal_login', { data: { ok: false, login: String((req.body && req.body.studentId) || '').slice(0, 60) } });
    return res.json({ ok: false, error: 'Неверный логин или пароль' });
  }
  try {
    const body = action === 'login' ? { ...(req.body || {}), task: key } : req.body || {};
    const result = await callTerminal(`/api/${action}`, body, sessions[key]);
    if (result.sid) sessions[key] = result.sid;
    else if (result.sid === '' || result.status === 401) delete sessions[key];
    if (action === 'login') log(req, 'terminal_login', { data: { ok: !!(result.body && result.body.ok) } });
    else if (action === 'logout') log(req, 'terminal_logout');
    else if (action === 'run' && result.status === 200) {
      const r = result.body || {};
      log(req, 'terminal_cmd', {
        data: {
          cmd: r.cmd === '' && body.cmd ? '(скрытый ввод)' : String(body.cmd || '').slice(0, 2000),
          interrupt: !!body.interrupt,
          prompt: r.prompt,
          mode: r.mode,
          output: r.clear ? '(clear)' : String(r.output || '').slice(0, 3000),
        },
      });
    }
    if (result.status >= 500) return res.status(result.status).type('text').send(result.body.error || 'error');
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(502).type('text').send(err.message);
  }
});

// -------------------------------------------------------------------- flags ---

router.post('/exam/:examId/flag/:taskId', requireOpen(), (req, res) => {
  const task = taskFrom(req, res, ['flag']);
  if (!task) return;
  const answer = String((req.body && req.body.answer) || '').trim();
  if (!answer || answer.length > MAX_ANSWER) return res.status(400).json({ error: 'Введите ответ.' });
  const { def, variant } = req.exam;
  const row = db.getExamTask(def.id, req.session.user.id, task.id);
  if (row && row.solved) {
    log(req, 'flag_answer', { stage: task.stage, task: task.id, data: { answer, ok: null, already: true } });
    return res.json({ ok: true, already: true });
  }
  const ok = examLib.checkFlag(task, answer, variant);
  db.recordExamAttempt(def.id, req.session.user.id, task.id, { answer, result: { ok }, solved: ok });
  log(req, 'flag_answer', { stage: task.stage, task: task.id, data: { answer, ok } });
  res.json({ ok, attempts: (row ? row.attempts : 0) + 1 });
});

// --------------------------------------------------------------------- code ---

router.post('/exam/:examId/task/:taskId/draft', requireOpen(), (req, res) => {
  const task = taskFrom(req, res, ['algorithm', 'bug', 'sql']);
  if (!task) return;
  const code = readCode(req, res);
  if (code === null) return;
  const { def } = req.exam;
  const before = db.getExamTask(def.id, req.session.user.id, task.id);
  if (before && before.draft === code) return res.json({ saved: true });
  if (!db.saveExamDraft(def.id, req.session.user.id, task.id, code)) {
    log(req, 'blocked_action', { stage: task.stage, task: task.id, data: { path: req.path, reason: 'locked' } });
    return res.status(409).json({ error: 'Задание закрыто: изменить код уже нельзя.' });
  }
  const data = { chars: code.length, lines: code.split('\n').length };
  if (task.kind === 'bug') data.changedLines = changedLines(code, task.starter);
  const event = log(req, 'draft_save', { stage: task.stage, task: task.id, data });
  if (task.kind !== 'sql') snapshot(req, event, task.id, 'draft', code);
  res.json({ saved: true });
});

// Permission for one «Запустить». Bug programs: 4 per task, the 4th locks the task with its code.
// Algorithm editors may not run the student's bug programs (that would bypass their limit).
router.post('/exam/:examId/task/:taskId/run', requireOpen(), (req, res) => {
  const task = taskFrom(req, res, ['algorithm', 'bug']);
  if (!task) return;
  const code = readCode(req, res);
  if (code === null) return;
  const stdin = String((req.body && req.body.stdin) || '').slice(0, 20000);
  const { def, tasks } = req.exam;
  const studentId = req.session.user.id;
  if (task.kind === 'algorithm') {
    const similar = tasks.filter((t) => t.kind === 'bug').find((t) => overlap(code, t.starter) >= 0.5);
    if (similar) {
      log(req, 'code_run_denied', { stage: task.stage, task: task.id, data: { reason: 'bug_program', like: similar.id } });
      return res.status(409).json({ error: `В этом редакторе запускается только решение задания ${task.id}. Код похож на программу из задания ${similar.id} — запускайте её там.` });
    }
    const event = log(req, 'code_run', { stage: task.stage, task: task.id, data: { stdin, chars: code.length } });
    snapshot(req, event, task.id, 'run', code);
    return res.json({ allowed: true, runsLeft: null, last: false, runId: event.seq });
  }
  const run = db.takeExamRun(def.id, studentId, task.id, MAX_RUNS, code);
  if (!run.allowed) {
    log(req, 'code_run_denied', { stage: task.stage, task: task.id, data: { reason: 'limit', runs: run.runs } });
    return res.status(409).json({ error: 'Запуски закончились: задание закрыто.', runsLeft: 0 });
  }
  const event = log(req, 'code_run', {
    stage: task.stage,
    task: task.id,
    data: { run: run.runs, of: MAX_RUNS, last: run.last, stdin, changedLines: changedLines(code, task.starter) },
  });
  snapshot(req, event, task.id, 'run', code);
  res.json({ allowed: true, runsLeft: MAX_RUNS - run.runs, last: run.last, runId: event.seq });
});

// What a run printed (from the browser), for the log only.
router.post('/exam/:examId/task/:taskId/run-result', (req, res) => {
  const task = taskFrom(req, res, ['algorithm', 'bug']);
  if (!task) return;
  const b = req.body || {};
  log(req, 'code_run_result', {
    stage: task.stage,
    task: task.id,
    data: { runId: Number(b.runId) || null, stdout: String(b.stdout || '').slice(0, 3000), error: b.error ? String(b.error).slice(0, 500) : null, timeout: !!b.timeout, stopped: !!b.stopped },
  });
  res.json({ ok: true });
});

// «Проверить» of an algorithm: built-in shortcuts are refused, then the outputs are compared.
router.post('/exam/:examId/task/:taskId/check', requireOpen(), (req, res) => {
  const task = taskFrom(req, res, ['algorithm']);
  if (!task) return;
  const code = readCode(req, res);
  if (code === null) return;
  const runs = readRuns(req, task);
  if (!runs) return res.status(400).json({ error: `Нужны результаты ${task.tests.length} запусков.` });
  const { def } = req.exam;
  const forbidden = forbiddenIn(code);
  const check = compareRuns(task, runs);
  const solved = check.solved && !forbidden.found.length;
  db.recordExamAttempt(def.id, req.session.user.id, task.id, {
    answer: code,
    result: { passed: check.passed, total: check.total, forbidden: forbidden.found, tests: check.tests.map((t) => ({ passed: t.passed, error: t.error })) },
    solved,
  });
  db.saveExamDraft(def.id, req.session.user.id, task.id, code);
  const event = log(req, 'code_check', { stage: task.stage, task: task.id, data: { passed: check.passed, total: check.total, forbidden: forbidden.found, solved } });
  snapshot(req, event, task.id, 'check', code);
  res.json({ ...check, solved, forbidden: forbidden.found });
});

// The single submission of a bug program (also sent by the page itself after the 4th run and
// when the time is up). The verdict is stored, not shown.
router.post('/exam/:examId/task/:taskId/submit', requireOpen({ grace: true }), (req, res) => {
  const task = taskFrom(req, res, ['bug']);
  if (!task) return;
  const code = readCode(req, res);
  if (code === null) return;
  const runs = readRuns(req, task);
  if (!runs) return res.status(400).json({ error: `Нужны результаты ${task.tests.length} запусков.` });
  const kind = ['manual', 'runs', 'timeout'].includes(req.body.kind) ? req.body.kind : 'manual';
  const { def } = req.exam;
  const check = compareRuns(task, runs);
  const result = { passed: check.passed, total: check.total, tests: check.tests.map((t) => ({ passed: t.passed, error: t.error })) };
  const ok = db.submitExamTask(def.id, req.session.user.id, task.id, { code, kind, result, solved: check.solved });
  const event = log(req, ok ? 'bug_submit' : 'blocked_action', {
    stage: task.stage,
    task: task.id,
    data: ok ? { kind, passed: check.passed, total: check.total, changedLines: changedLines(code, task.starter) } : { path: req.path, reason: 'already_submitted' },
  });
  if (ok) snapshot(req, event, task.id, 'submit', code);
  if (!ok) return res.status(409).json({ error: 'Задание уже отправлено.' });
  res.json({ submitted: true });
});

// «Вернуть исходный код»: the program as it was given; used runs are not returned.
router.post('/exam/:examId/task/:taskId/reset', requireOpen(), (req, res) => {
  const task = taskFrom(req, res, ['bug']);
  if (!task) return;
  const { def } = req.exam;
  if (!db.saveExamDraft(def.id, req.session.user.id, task.id, task.starter)) {
    return res.status(409).json({ error: 'Задание закрыто.' });
  }
  log(req, 'code_reset', { stage: task.stage, task: task.id });
  res.json({ code: task.starter });
});

// ---------------------------------------------------------------------- SQL ---

router.post('/exam/:examId/sql/:taskId', requireOpen(), (req, res) => {
  const task = taskFrom(req, res, ['sql']);
  if (!task) return;
  const text = String((req.body && req.body.sql) || '');
  if (text.length > MAX_SQL) return res.status(400).json({ error: `Запрос длиннее ${MAX_SQL} символов.` });
  const check = !!(req.body && req.body.check);
  const { def, scenario } = req.exam;
  const result = examSql.runSql(task, scenario.schemaSql, text, { check });
  db.saveExamDraft(def.id, req.session.user.id, task.id, text);
  if (check) {
    db.recordExamAttempt(def.id, req.session.user.id, task.id, {
      answer: text,
      result: { isCorrect: !!result.isCorrect, error: result.error || null, notice: result.notice || null },
      solved: !!result.isCorrect,
    });
  }
  log(req, check ? 'sql_check' : 'sql_run', {
    stage: task.stage,
    task: task.id,
    data: { sql: text, success: result.success, error: result.error || null, isCorrect: check ? !!result.isCorrect : undefined, notice: result.notice || null, rows: result.rowCount },
  });
  res.json(result);
});

// ------------------------------------------------------------------- report ---

router.post('/exam/:examId/report', requireOpen({ grace: true }), (req, res) => {
  const fields = (req.body && req.body.fields) || {};
  const value = {};
  for (const f of examLib.REPORT_FIELDS) value[f.key] = String(fields[f.key] || '').slice(0, examLib.MAX_REPORT_FIELD);
  const submit = !!(req.body && req.body.submit);
  db.saveExamReport(req.exam.def.id, req.session.user.id, examLib.REPORT_TASK, JSON.stringify(value), submit);
  log(req, submit ? 'report_submit' : 'report_save', {
    stage: 6,
    task: examLib.REPORT_TASK,
    data: submit ? value : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v.length])),
  });
  res.json({ saved: true, submitted: submit });
});

// ------------------------------------------------------------- client events ---

// Events only the browser sees: leaving the page, switching tabs, paste/copy, idle time.
router.post('/exam/:examId/log', (req, res) => {
  const events = Array.isArray(req.body && req.body.events) ? req.body.events.slice(0, 50) : [];
  for (const e of events) {
    if (!e || !CLIENT_EVENTS.includes(e.type)) continue;
    const task = typeof e.task === 'string' && /^\d\.\d$/.test(e.task) ? e.task : null;
    const stage = Number.isInteger(e.stage) && e.stage >= 1 && e.stage <= 6 ? e.stage : null;
    log(req, e.type, { stage, task, data: e.data && typeof e.data === 'object' ? e.data : {}, clientTs: typeof e.ts === 'string' ? e.ts.slice(0, 40) : null });
  }
  res.json({ ok: true });
});

module.exports = router;
module.exports.changedLines = changedLines;
module.exports.overlap = overlap;
