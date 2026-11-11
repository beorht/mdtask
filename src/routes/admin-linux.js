// Админ-раздел предмета «Linux Terminal Trainer» (/admin/linux): отчёт по практической работе и
// миссиям + карточка студента с журналом команд. Регистрируется на admin-роутере.
const course = require('../lib/linux-course');
const linuxAdmin = require('../lib/linux-course/admin');

function register(router, { render, notFound }) {
  router.get('/admin/linux', (req, res) => {
    const group = course.LINUX_GROUPS.includes(req.query.group) ? req.query.group : '';
    const filters = { q: (req.query.q || '').trim(), group };
    render(res, 'linux', 'linux', {
      pageTitle: 'Linux Terminal',
      filters,
      o: linuxAdmin.overview(filters),
      groups: course.LINUX_GROUPS,
    });
  });

  router.get('/admin/linux/students/:id', (req, res) => {
    const detail = linuxAdmin.studentDetail(req.params.id);
    if (!detail) return notFound(res, 'Студент не найден.');
    render(res, 'linux-student', 'linux', { pageTitle: `${detail.student.name} · Linux`, detail });
  });
}

module.exports = { register };
