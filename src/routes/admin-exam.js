// Admin pages of the IB final exam (src/lib/exam/admin.js). Registered on the admin router
// (src/routes/admin.js) so they share its teacher check and page locals.
const fs = require('fs');
const path = require('path');
const db = require('../db');
const examLib = require('../lib/exam');
const examAdmin = require('../lib/exam/admin');
const { logFile, readSnapshot } = require('../lib/exam/log');
const devices = require('../lib/exam/devices');

// The list of classroom PCs handed over by the college (only its table ib_pc is read).
const PC_FILE = path.join(__dirname, '..', '..', 'data', 'data_pc_ib.sqlite');

// The school's clock: the window is entered and shown in local time (UTC+5).
const TZ_OFFSET_MS = 5 * 3600 * 1000;
const GRACE_MS = 2 * 60 * 1000;

function toLocalInput(iso) {
  return new Date(Date.parse(iso) + TZ_OFFSET_MS).toISOString().slice(0, 16);
}

function fromLocalInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || ''))) return null;
  const ms = Date.parse(`${value}:00Z`) - TZ_OFFSET_MS;
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function register(router, { render, notFound, flash }) {
  function loadDef(req, res) {
    const def = examLib.getExamDef(req.params.examId);
    if (!def) {
      notFound(res, 'Нет такой контрольной.');
      return null;
    }
    const win = examLib.examWindow(def);
    if (Date.now() >= Date.parse(win.endsAt) + GRACE_MS) examLib.finalizeIfDue(def, win);
    return def;
  }

  const back = (def, studentId) => (studentId ? `/admin/exam/${def.id}/students/${studentId}` : `/admin/exam/${def.id}`);

  router.get('/admin/exam', (req, res) => res.redirect(`/admin/exam/${Object.keys(examLib.EXAMS)[0]}`));

  router.get('/admin/exam/:examId', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const o = examAdmin.overview(def);
    render(res, 'exam', 'exam', {
      pageTitle: def.title,
      def,
      o,
      stages: examLib.STAGES,
      startsLocal: toLocalInput(o.win.startsAt),
      endsLocal: toLocalInput(o.win.endsAt),
    });
  });

  router.post('/admin/exam/:examId/window', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const startsAt = fromLocalInput(req.body.startsAt);
    const endsAt = fromLocalInput(req.body.endsAt);
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) {
      flash(req, 'error', 'Укажите начало и конец; конец должен быть позже начала.');
    } else {
      db.setExamWindow(def.id, startsAt, endsAt);
      flash(req, 'success', `Время проведения: ${req.body.startsAt.replace('T', ' ')} — ${req.body.endsAt.replace('T', ' ')}.`);
    }
    res.redirect(back(def));
  });

  router.post('/admin/exam/:examId/issue', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    try {
      const { issued, total } = examAdmin.issueForGroup(def);
      flash(req, 'success', issued.length ? `Выдано вариантов: ${issued.length} (всего в группе ${total}).` : `Все ${total} студентов группы уже с вариантами; недостающие песочницы созданы.`);
    } catch (err) {
      flash(req, 'error', `Не удалось выдать варианты: ${err.message}`);
    }
    res.redirect(back(def));
  });

  router.post('/admin/exam/:examId/students/:studentId/reissue', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const index = Math.max(1, Math.min(18, parseInt(req.body.index, 10) || 1)) - 1;
    try {
      examAdmin.reissue(def, req.params.studentId, index);
      flash(req, 'success', `Выдан вариант №${index + 1}; прежние ответы студента по контрольной удалены.`);
    } catch (err) {
      flash(req, 'error', err.message);
    }
    res.redirect(back(def, req.params.studentId));
  });

  router.post('/admin/exam/:examId/students/:studentId/sandbox', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    try {
      examAdmin.rebuildSandbox(def, req.params.studentId);
      flash(req, 'success', 'Песочница терминала пересоздана (ответы и прогресс сохранены).');
    } catch (err) {
      flash(req, 'error', err.message);
    }
    res.redirect(back(def, req.params.studentId));
  });

  router.post('/admin/exam/:examId/publish', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const publish = req.body.published === '1';
    db.setExamPublished(def.id, publish);
    flash(req, 'success', publish ? 'Результаты опубликованы: студенты видят баллы и оценку.' : 'Публикация результатов снята.');
    res.redirect(back(def));
  });

  router.post('/admin/exam/:examId/students/:studentId/report-score', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const raw = String(req.body.score || '').replace(',', '.').trim();
    const score = raw === '' ? null : Number(raw);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 10)) {
      flash(req, 'error', 'Баллы за отчёт — число от 0 до 10.');
    } else if (!db.getExamVariant(def.id, req.params.studentId)) {
      flash(req, 'error', 'У студента нет варианта.');
    } else {
      db.setExamTeacherScore(def.id, req.params.studentId, examLib.REPORT_TASK, score);
      flash(req, 'success', score === null ? 'Оценка отчёта снята.' : `Отчёт оценён: ${score} из 10.`);
    }
    res.redirect(back(def, req.params.studentId));
  });

  router.post('/admin/exam/:examId/lock-practice', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const locked = req.body.locked === '1';
    db.setExamLockPractice(def.id, locked);
    flash(req, 'success', locked ? `Практические группы ${def.group} закрыты.` : `Практические группы ${def.group} открыты (пока идёт контрольная, задания ИБ и SQL-тренажёр всё равно закрыты).`);
    res.redirect(back(def));
  });

  router.post('/admin/exam/:examId/devices', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const mode = req.body.mode;
    if (!devices.DEVICE_MODES[mode]) flash(req, 'error', 'Неизвестный режим.');
    else {
      db.setExamDeviceMode(def.id, mode);
      flash(req, 'success', `Проверка устройства: ${devices.DEVICE_MODES[mode].toLowerCase()}.`);
    }
    res.redirect(back(def));
  });

  router.get('/admin/exam/:examId/pcs', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    render(res, 'exam-pcs', 'exam', { pageTitle: 'Компьютеры аудитории', def, pcs: db.getExamPcs(), pcFile: fs.existsSync(PC_FILE) ? 'data/data_pc_ib.sqlite' : null });
  });

  router.post('/admin/exam/:examId/pcs', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const pc = { name: String(req.body.name || '').trim(), ip: devices.normalizeIp(req.body.ip), mac: String(req.body.mac || '').trim(), room: String(req.body.room || '').trim() };
    const error = devices.validPc(pc);
    if (error) flash(req, 'error', error);
    else {
      db.saveExamPc({ ...pc, mac: devices.normalizeMac(pc.mac) });
      flash(req, 'success', `Компьютер ${pc.name} сохранён.`);
    }
    res.redirect(`/admin/exam/${def.id}/pcs`);
  });

  router.post('/admin/exam/:examId/pcs/:id/delete', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    db.deleteExamPc(Number(req.params.id));
    flash(req, 'success', 'Компьютер удалён из списка.');
    res.redirect(`/admin/exam/${def.id}/pcs`);
  });

  router.post('/admin/exam/:examId/pcs/import', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    try {
      const r = devices.importPcs(PC_FILE);
      flash(req, r.skipped.length ? 'error' : 'success', `Импортировано компьютеров: ${r.saved} из ${r.total}.${r.skipped.length ? ' Пропущены (нет имени или IP): ' + r.skipped.join(', ') : ''}`);
    } catch (err) {
      flash(req, 'error', `Не удалось прочитать data/data_pc_ib.sqlite: ${err.message}`);
    }
    res.redirect(`/admin/exam/${def.id}/pcs`);
  });

  router.post('/admin/exam/:examId/students/:studentId/any-device', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const allowed = req.body.allowed === '1';
    db.setExamAnyDevice(def.id, req.params.studentId, allowed);
    flash(req, 'success', allowed ? 'Студенту разрешено писать контрольную с любого устройства.' : 'Студент снова может писать только с ПК аудитории.');
    res.redirect(back(def, req.params.studentId));
  });

  router.get('/admin/exam/:examId/students/:studentId', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const d = examAdmin.detail(def, req.params.studentId);
    if (!d) return notFound(res, 'У этого студента нет варианта контрольной.');
    render(res, 'exam-student', 'exam', { pageTitle: `${d.student.name} · ${def.title}`, def, d, stages: examLib.STAGES });
  });

  router.get('/admin/exam/:examId/students/:studentId/log.jsonl', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    let file;
    try {
      file = logFile(def.id, req.params.studentId);
    } catch (err) {
      return notFound(res);
    }
    if (!fs.existsSync(file)) return notFound(res, 'Журнал пуст.');
    res.download(file, `${def.id}-${req.params.studentId}.jsonl`);
  });

  router.get('/admin/exam/:examId/students/:studentId/snapshot/:name', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    const code = readSnapshot(def.id, req.params.studentId, req.params.name);
    if (code === null) return notFound(res, 'Нет такого снимка кода.');
    res.type('text/plain; charset=utf-8').send(code);
  });

  router.get('/admin/exam/:examId/export.csv', (req, res) => {
    const def = loadDef(req, res);
    if (!def) return;
    res.type('text/csv; charset=utf-8').attachment(`${def.id}.csv`).send(examAdmin.csv(def));
  });
}

module.exports = { register, toLocalInput, fromLocalInput };
