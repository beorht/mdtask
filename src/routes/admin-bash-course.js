// Админка предмета «Bash: скрипты в Linux» (src/lib/bash-course): матрица «студент × тема», карточка студента
// с кодом и попытками, «Сбросить». Регистрируется на админ-роутере.
const db = require('../db');
const courseAdmin = require('../lib/bash-course/admin');
const { SUBJECT_TITLE } = require('../lib/bash-course');

function register(router, { render, notFound, flash }) {
  router.get('/admin/bash-course', (req, res) => {
    const filters = { q: (req.query.q || '').trim() };
    render(res, 'bash-course', 'bash-course', { pageTitle: SUBJECT_TITLE, filters, o: courseAdmin.overview(filters) });
  });

  router.get('/admin/bash-course/students/:id', (req, res) => {
    const detail = courseAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'bash-course-student', 'bash-course', { pageTitle: `${detail.student.name} · ${SUBJECT_TITLE}`, detail });
  });

  router.post('/admin/bash-course/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    db.resetBashCourseStudent(student.id);
    flash(req, 'success', 'Прогресс студента по предмету Bash обнулён: черновики, решения, ответы и попытки удалены.');
    res.redirect(`/admin/bash-course/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
