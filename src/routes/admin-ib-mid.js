// Админ-раздел средней контрольной ИБ (/admin/ib-mid): матрица «студент × задание», карточка
// студента с его работами, выставление баллов, сброс. Регистрируется на admin-роутере.
const db = require('../db');
const mid = require('../lib/ib-mid');
const midAdmin = require('../lib/ib-mid/admin');

function register(router, { render, notFound, flash }) {
  router.get('/admin/ib-mid', (req, res) => {
    const group = mid.MID_GROUPS.includes(req.query.group) ? req.query.group : '';
    const filters = { q: (req.query.q || '').trim(), group };
    render(res, 'ib-mid', 'ibmid', {
      pageTitle: mid.MID_TITLE,
      filters,
      o: midAdmin.overview(filters),
      groups: mid.MID_GROUPS,
    });
  });

  router.get('/admin/ib-mid/students/:id', (req, res) => {
    const detail = midAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'ib-mid-student', 'ibmid', { pageTitle: `${detail.student.name} · контрольная ИБ`, detail });
  });

  router.post('/admin/ib-mid/students/:id/score', (req, res) => {
    const student = db.getUserById(req.params.id);
    const back = `/admin/ib-mid/students/${encodeURIComponent(req.params.id)}`;
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    if (!mid.findMidTask(req.body.task_id)) {
      flash(req, 'error', 'Неизвестное задание.');
      return res.redirect(back);
    }
    const raw = (req.body.score || '').trim();
    const score = raw === '' ? null : Number(raw);
    if (score !== null && !Number.isFinite(score)) {
      flash(req, 'error', 'Балл должен быть числом.');
      return res.redirect(back);
    }
    db.setMidScore(student.id, req.body.task_id, score);
    flash(req, 'success', 'Оценка сохранена.');
    res.redirect(back);
  });

  router.post('/admin/ib-mid/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    const back = `/admin/ib-mid/students/${encodeURIComponent(req.params.id)}`;
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    if (!mid.findMidTask(req.body.task_id)) {
      flash(req, 'error', 'Неизвестное задание.');
      return res.redirect(back);
    }
    db.resetMidTask(student.id, req.body.task_id);
    flash(req, 'success', 'Задание студента сброшено.');
    res.redirect(back);
  });
}

module.exports = { register };
