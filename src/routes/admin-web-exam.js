// Admin pages of the WEB group's final exam (src/lib/web-exam): running it (window, variants, practice
// lock, device check, publishing), the results table, one student's work with the 10 requirements to grade,
// the preview of the student's application and the archives of the files. Registered on the admin router.
const db = require('../db');
const web = require('../lib/web-exam');
const devices = require('../lib/exam/devices');

const TZ_OFFSET_MS = 5 * 3600 * 1000;
const SUSPICIOUS = ['paste_blocked', 'paste', 'autotype', 'page_leave', 'visibility', 'device_blocked', 'device_change'];

function toLocalInput(iso) {
  return new Date(Date.parse(iso) + TZ_OFFSET_MS).toISOString().slice(0, 16);
}

function fromLocalInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || ''))) return null;
  const ms = Date.parse(`${value}:00Z`) - TZ_OFFSET_MS;
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function groupStudents(def) {
  return db
    .getUsers()
    .filter((u) => u.role === 'student' && u.group === def.group)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function eventCounts(examId, studentId) {
  const counts = {};
  for (const e of db.getExamEvents(examId, studentId)) counts[e.type] = (counts[e.type] || 0) + 1;
  return counts;
}

function overview(def) {
  const win = web.examWindow(def);
  const students = groupStudents(def);
  const list = students.map((s) => {
    const variant = db.getExamVariant(def.id, s.id);
    const row = variant ? db.getExamTask(def.id, s.id, web.TASK_ID) : null;
    const files = web.filesOf(row);
    const counts = variant ? eventCounts(def.id, s.id) : {};
    return {
      student: s,
      variant,
      app: variant ? web.variantOf(variant).app : null,
      savedAt: row ? row.updatedAt : null,
      sizes: web.FILES.map((f) => files[f].length),
      snapshots: variant ? web.listSnapshots(def.id, s.id).length : 0,
      counts,
      grade: web.gradeState(row),
      pc: counts.device_blocked ? 'не с ПК аудитории' : null,
    };
  });
  return { win, phase: web.phaseOf(win), list, issued: list.filter((r) => r.variant).length, total: list.length };
}

function register(router, { render, notFound, flash }) {
  function loadDef(req, res) {
    const def = web.getExamDef(req.params.examId);
    if (!def) {
      notFound(res, 'Нет такой контрольной.');
      return null;
    }
    return def;
  }

  function loadStudent(req, res, def) {
    const student = db.getUserById(req.params.studentId);
    const variant = student && db.getExamVariant(def.id, student.id);
    if (!variant) {
      notFound(res, 'У этого студента нет варианта контрольной.');
      return null;
    }
    return { student, variant };
  }

  const back = (def, studentId) => (studentId ? `/admin/web-exam/${def.id}/students/${studentId}` : `/admin/web-exam/${def.id}`);

  router.get('/admin/web-exam', (req, res) => res.redirect(`/admin/web-exam/${Object.keys(web.EXAMS)[0]}`));

  router.get('/admin/web-exam/:examId', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const o = overview(def);
    render(res, 'web-exam', 'webexam', {
      pageTitle: `${def.title} WEB`,
      def,
      o,
      startsLocal: toLocalInput(o.win.startsAt),
      endsLocal: toLocalInput(o.win.endsAt),
      deviceModes: devices.DEVICE_MODES,
      maxScore: web.MAX_SCORE,
      themes: web.THEMES,
    });
  });

  router.post('/admin/web-exam/:examId/window', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const startsAt = fromLocalInput(req.body.startsAt);
    const endsAt = fromLocalInput(req.body.endsAt);
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) {
      flash(req, 'error', 'Укажите начало и конец; конец должен быть позже начала.');
    } else {
      web.examWindow(def);
      db.setExamWindow(def.id, startsAt, endsAt);
      flash(req, 'success', `Время проведения: ${req.body.startsAt.replace('T', ' ')} — ${req.body.endsAt.replace('T', ' ')}.`);
    }
    res.redirect(back(def));
  });

  router.post('/admin/web-exam/:examId/issue', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const students = groupStudents(def);
    let issued = 0;
    students.forEach((s, index) => {
      if (db.getExamVariant(def.id, s.id)) return;
      web.issueVariant(def, s.id, index);
      issued += 1;
    });
    flash(req, 'success', issued ? `Выдано вариантов: ${issued} (всего в группе ${students.length}).` : `У всех ${students.length} студентов группы уже есть варианты.`);
    res.redirect(back(def));
  });

  router.post('/admin/web-exam/:examId/publish', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const publish = req.body.published === '1';
    web.examWindow(def);
    db.setExamPublished(def.id, publish);
    flash(req, 'success', publish ? 'Результаты опубликованы: студенты видят баллы и оценку.' : 'Публикация результатов снята.');
    res.redirect(back(def));
  });

  router.post('/admin/web-exam/:examId/lock-practice', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const locked = req.body.locked === '1';
    web.examWindow(def);
    db.setExamLockPractice(def.id, locked);
    flash(req, 'success', locked ? `Практические группы ${def.group} закрыты.` : `Практические группы ${def.group} открыты (пока идёт контрольная, они всё равно закрыты).`);
    res.redirect(back(def));
  });

  router.post('/admin/web-exam/:examId/devices', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const mode = req.body.mode;
    if (!devices.DEVICE_MODES[mode]) flash(req, 'error', 'Неизвестный режим.');
    else {
      web.examWindow(def);
      db.setExamDeviceMode(def.id, mode);
      flash(req, 'success', `Проверка устройства: ${devices.DEVICE_MODES[mode].toLowerCase()}.`);
    }
    res.redirect(back(def));
  });

  router.get('/admin/web-exam/:examId/all.zip', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const students = groupStudents(def).filter((s) => db.getExamVariant(def.id, s.id));
    res.attachment(`${def.id}-все-работы.zip`);
    res.type('application/zip').send(web.allZip(def, students));
  });

  router.get('/admin/web-exam/:examId/students/:studentId', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const found = loadStudent(req, res, def);
    if (!found) return;
    const { student, variant } = found;
    const v = web.variantOf(variant);
    const row = db.getExamTask(def.id, student.id, web.TASK_ID);
    const events = db.getExamEvents(def.id, student.id);
    render(res, 'web-exam-student', 'webexam', {
      pageTitle: `${student.name} · контрольная WEB`,
      def,
      student,
      v,
      requirements: web.requirementsOf(v),
      files: web.filesOf(row),
      savedAt: row ? row.updatedAt : null,
      grade: web.gradeState(row),
      marks: web.MARKS,
      maxScore: web.MAX_SCORE,
      snapshots: web.listSnapshots(def.id, student.id),
      events: events.slice(-300).reverse(),
      counts: eventCounts(def.id, student.id),
      suspicious: SUSPICIOUS,
    });
  });

  router.post('/admin/web-exam/:examId/students/:studentId/grade', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const found = loadStudent(req, res, def);
    if (!found) return;
    const marks = web.parseMarks(req.body);
    if (!marks) {
      flash(req, 'error', 'Баллы за требование — 0, 5 или 10.');
      return res.redirect(back(def, found.student.id));
    }
    const comment = String(req.body.comment || '').slice(0, 4000);
    db.getExamTask(def.id, found.student.id, web.TASK_ID) || db.saveExamDraft(def.id, found.student.id, web.TASK_ID, '');
    const graded = Object.keys(marks).length > 0;
    db.setExamTaskResult(def.id, found.student.id, web.TASK_ID, { marks, comment, gradedAt: new Date().toISOString() }, graded);
    const total = Object.values(marks).reduce((s, m) => s + m, 0);
    db.setExamTeacherScore(def.id, found.student.id, web.TASK_ID, graded ? total : null);
    flash(req, 'success', graded ? `Оценено: ${total} из ${web.MAX_SCORE}, оценка ${web.gradeOf(total)}.` : 'Оценка снята.');
    res.redirect(back(def, found.student.id));
  });

  router.get('/admin/web-exam/:examId/students/:studentId/files.zip', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const found = loadStudent(req, res, def);
    if (!found) return;
    res.attachment(`${def.id}-${web.safeFolder(found.student)}.zip`);
    res.type('application/zip').send(web.studentZip(def, found.student));
  });

  router.get('/admin/web-exam/:examId/students/:studentId/snapshot/:name', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const found = loadStudent(req, res, def);
    if (!found) return;
    const snap = web.readSnapshot(def.id, found.student.id, req.params.name);
    if (!snap) return res.status(404).json({ error: 'Нет такого снимка.' });
    res.json(snap);
  });
}

module.exports = { register, overview };
