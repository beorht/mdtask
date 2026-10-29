// Admin pages of the «Web-разработка: CSS» subject (src/lib/css-course): matrix «student × task» per topic,
// one student's tasks with code and log, «Сбросить». Registered on the admin router.
const db = require('../db');
const course = require('../lib/css-course');
const courseAdmin = require('../lib/css-course/admin');

function register(router, { render, notFound, flash }) {
  router.get('/admin/css', (req, res) => {
    const filters = { q: (req.query.q || '').trim(), pick: req.query.pick === '1' };
    render(res, 'css-course', 'css', { pageTitle: course.CSS_TITLE, filters, o: courseAdmin.overview(filters), groups: course.CSS_GROUPS });
  });

  router.get('/admin/css/students/:id', (req, res) => {
    const detail = courseAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'css-course-student', 'css', { pageTitle: `${detail.student.name} · CSS`, detail });
  });

  router.post('/admin/css/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    db.resetCssStudent(student.id);
    flash(req, 'success', 'Прогресс студента по предмету CSS обнулён: теория и практика начинаются заново.');
    res.redirect(`/admin/css/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
