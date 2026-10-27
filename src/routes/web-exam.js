// Итоговая контрольная группы WEB (src/lib/web-exam): the student's page with the technical specification,
// the HTML/CSS/JS editor and the sandboxed preview, plus saving and the action log. Mounted before
// src/routes/exam.js: requests for any other exam id fall through to it.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const db = require('../db');
const web = require('../lib/web-exam');
const { logEvent } = require('../lib/exam/log');
const { checkDevice } = require('../lib/exam/devices');

const router = express.Router();

const CLIENT_EVENTS = ['page_leave', 'visibility', 'blur', 'focus', 'paste', 'copy', 'idle', 'timer_end', 'device_info',
  'paste_blocked', 'autotype', 'run', 'preview_error', 'storage_reset'];

function log(req, type, fields = {}) {
  try {
    return logEvent(req.webExam.def.id, req.session.user.id, { ...fields, type, req });
  } catch (err) {
    console.error('web exam log:', err.message);
    return { seq: 0 };
  }
}

function loadWebExam(req, res, next) {
  const def = web.getExamDef(req.params.examId);
  if (!def) return next('route');
  const user = req.session.user;
  const variant = db.getExamVariant(def.id, user.id);
  if (!variant) return res.status(404).render('404');
  const win = web.examWindow(def);
  const phase = web.phaseFor(def, user, win);
  if (phase === 'before') return res.status(404).render('404');
  req.webExam = { def, win, phase, variant, v: web.variantOf(variant) };
  const userAgent = String(req.get('user-agent') || '').slice(0, 300);
  const seen = req.session.examSessions || (req.session.examSessions = {});
  if (!seen[def.id]) {
    seen[def.id] = true;
    log(req, 'session_start', { data: { userAgent } });
  }
  // Classroom PCs only (src/lib/exam/devices.js); for WEB the mode starts as «warn» (logged, allowed).
  const device = checkDevice(win, variant, user, req.ip);
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

// Saving is accepted while the exam runs and for two minutes after (the page's own last save at the end).
function canSave(req) {
  const { phase, win } = req.webExam;
  return phase === 'open' || Date.now() < Date.parse(win.endsAt) + web.SUBMIT_GRACE_MS;
}

router.get('/exam/:examId', requireRole('student'), loadWebExam, (req, res) => {
  const { def, win, phase, v } = req.webExam;
  const user = req.session.user;
  const row = db.getExamTask(def.id, user.id, web.TASK_ID);
  const grade = web.gradeState(row);
  res.render('web-exam/index', {
    user,
    pageTitle: def.title,
    exam: def,
    win,
    phase,
    base: `/exam/${def.id}`,
    v,
    requirements: web.requirementsOf(v),
    files: web.filesOf(row),
    savedAt: row ? row.updatedAt : null,
    // Scores only after the teacher publishes them.
    result: win.publishedAt && grade.graded ? grade : null,
    maxScore: web.MAX_SCORE,
  });
});

router.post('/exam/:examId/save', requireRole('student'), loadWebExam, (req, res) => {
  if (!canSave(req)) {
    log(req, 'blocked_action', { data: { path: req.path, reason: 'closed' } });
    return res.status(409).json({ error: 'Контрольная завершена: изменить код уже нельзя.' });
  }
  const files = web.parseFiles(req.body);
  if (!files) return res.status(400).json({ error: `Файлы не получены или длиннее ${web.MAX_FILE} символов.` });
  const { def } = req.webExam;
  const studentId = req.session.user.id;
  db.saveExamDraft(def.id, studentId, web.TASK_ID, JSON.stringify(files));
  const manual = !!(req.body && req.body.manual);
  const sizes = Object.fromEntries(web.FILES.map((f) => [f, files[f].length]));
  const due = manual || Date.now() - web.lastSnapshotAt(def.id, studentId) >= web.SNAPSHOT_EVERY_MS;
  const event = log(req, manual ? 'save' : 'autosave', { task: web.TASK_ID, data: { sizes } });
  let snapshot = null;
  if (due && event.seq) {
    try {
      snapshot = web.saveSnapshot(def.id, studentId, event.seq, files);
    } catch (err) {
      snapshot = null;
    }
  }
  res.json({ ok: true, savedAt: new Date().toISOString(), snapshot: !!snapshot });
});

router.post('/exam/:examId/log', requireRole('student'), loadWebExam, (req, res) => {
  const events = Array.isArray(req.body && req.body.events) ? req.body.events.slice(0, 50) : [];
  for (const e of events) {
    if (!e || !CLIENT_EVENTS.includes(e.type)) continue;
    log(req, e.type, { task: web.TASK_ID, data: e.data && typeof e.data === 'object' ? e.data : {}, clientTs: typeof e.ts === 'string' ? e.ts.slice(0, 40) : null });
  }
  res.json({ ok: true });
});

module.exports = router;
