// Admin pages of the «JavaScript: от синтаксиса до DOM» course (src/lib/js-course): matrix «student × lesson», one student's
// tasks with code and attempts, «Сбросить». Registered on the admin router.
const db = require('../db');
const courseAdmin = require('../lib/js-course/admin');
const { COURSE_TITLE } = require('../lib/js-course');

function register(router, { render, notFound, flash }) {
  router.get('/admin/js-course', (req, res) => {
    const filters = { q: (req.query.q || '').trim() };
    render(res, 'js-course', 'js-course', { pageTitle: COURSE_TITLE, filters, o: courseAdmin.overview(filters) });
  });

  router.get('/admin/js-course/students/:id', (req, res) => {
    const detail = courseAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'js-course-student', 'js-course', { pageTitle: `${detail.student.name} · ${COURSE_TITLE}`, detail });
  });

  router.post('/admin/js-course/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    db.resetJsCourseStudent(student.id);
    flash(req, 'success', 'Прогресс студента по курсу обнулён: черновики, решения и попытки удалены.');
    res.redirect(`/admin/js-course/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
