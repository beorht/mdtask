// Admin pages of the «Web-разработка: HTML» subject (src/lib/html-course): matrix «student × task» per topic,
// one student's tasks with code and log, «Сбросить». Registered on the admin router.
const db = require('../db');
const course = require('../lib/html-course');
const courseAdmin = require('../lib/html-course/admin');

function register(router, { render, notFound, flash }) {
  router.get('/admin/html', (req, res) => {
    const filters = { q: (req.query.q || '').trim() };
    render(res, 'html-course', 'html', { pageTitle: course.HTML_TITLE, filters, o: courseAdmin.overview(filters) });
  });

  router.get('/admin/html/students/:id', (req, res) => {
    const detail = courseAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'html-course-student', 'html', { pageTitle: `${detail.student.name} · HTML`, detail });
  });

  router.post('/admin/html/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    db.resetHtmlStudent(student.id);
    flash(req, 'success', 'Прогресс студента по предмету HTML обнулён: теория и практика начинаются заново.');
    res.redirect(`/admin/html/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
