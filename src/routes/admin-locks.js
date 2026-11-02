// Админ-страница «Доступ к темам» (/admin/locks): блокировка/дедлайн/открытие тем по группам и студентам
// (src/lib/admin-locks.js, src/lib/topic-locks.js). Регистрируется на admin-роутере.
const db = require('../db');
const adminLocks = require('../lib/admin-locks');

function redirectBack(res, body) {
  const q = new URLSearchParams();
  if (body.subject) q.set('subject', body.subject);
  const scope = body.scope === 'student' ? 'student' : 'group';
  q.set('scope', scope);
  if (scope === 'student') q.set('student', body.target || body.student || '');
  else q.set('group', body.target || body.group || '');
  res.redirect(`/admin/locks?${q.toString()}`);
}

function register(router, { render, flash }) {
  router.get('/admin/locks', (req, res) => {
    const data = adminLocks.pageData({
      subject: req.query.subject, scope: req.query.scope, group: req.query.group, student: req.query.student,
    });
    render(res, 'locks', 'locks', { pageTitle: 'Доступ к темам', ...data });
  });

  router.post('/admin/locks/set', (req, res) => {
    const { subject, topic_key: topicKey, scope, target, mode } = req.body;
    const note = (req.body.note || '').trim() || null;
    const deadline = mode === 'deadline' ? adminLocks.fromLocalInput(req.body.deadline) : null;
    if (!subject || !topicKey || !['group', 'student'].includes(scope) || !target || !['lock', 'deadline', 'allow'].includes(mode)) {
      flash(req, 'error', 'Неверные данные формы.');
      return redirectBack(res, req.body);
    }
    if (mode === 'allow' && scope !== 'student') {
      flash(req, 'error', '«Открыть доступ» доступно только для отдельного студента.');
      return redirectBack(res, req.body);
    }
    if (mode === 'deadline' && !deadline) {
      flash(req, 'error', 'Укажите дату и время дедлайна.');
      return redirectBack(res, req.body);
    }
    db.setTopicOverride({ subject, topicKey, scope, target, mode, deadline, note, by: req.session.user.id });
    flash(req, 'success', 'Настройка темы сохранена.');
    redirectBack(res, req.body);
  });

  router.post('/admin/locks/clear', (req, res) => {
    const { subject, topic_key: topicKey, scope, target } = req.body;
    if (subject && topicKey && scope && target) db.clearTopicOverride(subject, topicKey, scope, target);
    flash(req, 'success', 'Настройка темы снята.');
    redirectBack(res, req.body);
  });
}

module.exports = { register };
