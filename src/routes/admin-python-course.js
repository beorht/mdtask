// Admin pages of the «Начальный Python» course (src/lib/python-course): matrix «student × lesson», one student's
// tasks with code and attempts, «Сбросить». Registered on the admin router.
const db = require('../db');
const courseAdmin = require('../lib/python-course/admin');
const { COURSE_TITLE } = require('../lib/python-course');

function register(router, { render, notFound, flash }) {
  router.get('/admin/python-course', (req, res) => {
    const filters = { q: (req.query.q || '').trim() };
    render(res, 'python-course', 'python-course', { pageTitle: COURSE_TITLE, filters, o: courseAdmin.overview(filters) });
  });

  router.get('/admin/python-course/students/:id', (req, res) => {
    const detail = courseAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'python-course-student', 'python-course', { pageTitle: `${detail.student.name} · ${COURSE_TITLE}`, detail });
  });

  router.post('/admin/python-course/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    db.resetPythonCourseStudent(student.id);
    flash(req, 'success', 'Прогресс студента по курсу обнулён: черновики, решения и попытки удалены.');
    res.redirect(`/admin/python-course/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
