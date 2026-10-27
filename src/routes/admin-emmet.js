// Admin pages of the Emmet trainer (src/lib/emmet): summary and matrix, one student's work and log,
// «Новый набор» / «Сбросить», «Завершить / Открыть занятие» per group, CSV. Registered on the admin router.
const db = require('../db');
const emmet = require('../lib/emmet');
const emmetAdmin = require('../lib/emmet/admin');

function register(router, { render, notFound, flash }) {
  router.get('/admin/emmet', (req, res) => {
    const filters = { q: (req.query.q || '').trim(), group: req.query.group || '', pick: req.query.pick === '1' };
    const tab = emmetAdmin.SECTIONS.some((s) => s.key === req.query.tab) ? req.query.tab : 'emmet';
    render(res, 'emmet', 'emmet', { pageTitle: 'Emmet · Тетрадь', filters, tab, o: emmetAdmin.overview(filters), groups: emmet.emmetGroups() });
  });

  router.get('/admin/emmet.csv', (req, res) => {
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="emmet-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(emmetAdmin.csv());
  });

  router.post('/admin/emmet/session', (req, res) => {
    const group = String(req.body.group || '');
    if (!emmet.emmetGroups().includes(group)) return notFound(res, 'Нет такой группы.');
    const closed = req.body.closed === '1';
    db.setEmmetSessionClosed(group, closed);
    flash(req, 'success', closed ? `Занятие группы ${group} завершено: студенты видят «Занятие окончено».` : `Занятие группы ${group} снова открыто.`);
    res.redirect('/admin/emmet');
  });

  router.get('/admin/emmet/students/:id', (req, res) => {
    const detail = emmetAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'emmet-student', 'emmet', { pageTitle: `${detail.student.name} · Emmet`, detail });
  });

  router.post('/admin/emmet/students/:id/:action', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    if (req.params.action === 'reassign') {
      emmet.reassign(student.id);
      flash(req, 'success', 'Выданы новые случайные наборы работ (с условием и без подсказок). Решённые работы остаются в статистике.');
    } else if (req.params.action === 'reset') {
      db.resetEmmetStudent(student.id);
      flash(req, 'success', 'Статистика студента обнулена, набор работ оставлен.');
    } else {
      return notFound(res);
    }
    res.redirect(`/admin/emmet/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
