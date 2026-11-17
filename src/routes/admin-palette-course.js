// Админка предмета «Цвет и палитра» (src/lib/palette-course): матрица «студент × тема», карточка студента
// с CSS и попытками, «Сбросить». Регистрируется на админ-роутере.
const db = require('../db');
const courseAdmin = require('../lib/palette-course/admin');
const { SUBJECT_TITLE } = require('../lib/palette-course');

function register(router, { render, notFound, flash }) {
  router.get('/admin/palette', (req, res) => {
    const filters = { q: (req.query.q || '').trim() };
    render(res, 'palette-course', 'palette-course', { pageTitle: SUBJECT_TITLE, filters, o: courseAdmin.overview(filters) });
  });

  router.get('/admin/palette/students/:id', (req, res) => {
    const detail = courseAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'palette-course-student', 'palette-course', { pageTitle: `${detail.student.name} · ${SUBJECT_TITLE}`, detail });
  });

  router.post('/admin/palette/students/:id/reset', (req, res) => {
    const student = db.getUserById(req.params.id);
    if (!student || student.role !== 'student') return notFound(res, 'Студент не найден.');
    db.resetPaletteStudent(student.id);
    flash(req, 'success', 'Прогресс студента по предмету «Цвет и палитра» обнулён.');
    res.redirect(`/admin/palette/students/${encodeURIComponent(student.id)}`);
  });
}

module.exports = { register };
