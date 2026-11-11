// «Linux Terminal Trainer» (src/lib/linux-course/): страница предмета, страница миссии (3-панельный
// тренажёр) и её API. Mounted before `student` so /subjects/linux isn't taken by /subjects/:key.
// Во время итоговой контрольной закрыт (blockDuringExam), как остальная практика.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { blockDuringExam } = require('../middleware/exam-lock');
const { examLockFor } = require('../lib/exam');
const { buildSidebarTree } = require('../lib/sidebar');
const course = require('../lib/linux-course');
const practical = require('../lib/linux-course/practical');

const router = express.Router();
const BASE = `/subjects/${course.LINUX_KEY}`;

function fmtTime(iso) {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function requireVisible(req, res, next) {
  if (!course.canSeeLinux(req.session.user)) return res.status(404).render('404');
  next();
}

const page = [requireRole('student'), requireVisible, blockDuringExam];

function sidebar(user) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: course.LINUX_KEY });
}

router.get(BASE, ...page, (req, res) => {
  const user = req.session.user;
  res.render('linux-course/index', {
    user,
    sidebarTree: sidebar(user),
    activeAssignmentId: null,
    activePath: BASE,
    title: course.LINUX_TITLE,
    base: BASE,
    lead: course.LINUX_LEAD,
    summary: course.summaryForStudent(user),
    practical: (function () {
      const v = practical.view(user);
      const win = practical.windowState();
      return {
        title: practical.TITLE,
        href: `${BASE}/practical`,
        open: practical.isOpenFor(user),
        opensText: win.opensAt ? fmtTime(win.opensAt) : null,
        solvedCount: v.solvedCount,
        total: v.total,
        done: v.done,
      };
    })(),
  });
});

// Практическая работа «Терминал»: одна страница с последовательностью шагов (общая ФС).
router.get(`${BASE}/practical`, ...page, (req, res) => {
  const user = req.session.user;
  const win = practical.windowState();
  const open = practical.isOpenFor(user);
  res.render('linux-course/practical-work', {
    user,
    base: BASE,
    pageTitle: `${practical.TITLE} · ${course.LINUX_TITLE}`,
    title: practical.TITLE,
    open,
    opensText: win.opensAt ? fmtTime(win.opensAt) : null,
  });
});

function practicalApi(handler) {
  return (req, res) => {
    const user = req.session.user;
    res.set('Cache-Control', 'no-store');
    if (!user) return res.status(401).json({ error: 'Войдите на сайт заново.' });
    if (user.mustChangePassword) return res.status(401).json({ error: 'Сначала смените пароль.' });
    if (!practical.canSee(user)) return res.status(404).json({ error: 'Недоступно.' });
    const lock = examLockFor(user);
    if (lock) return res.status(423).json({ error: lock.during ? 'Закрыто на время контрольной.' : 'Закрыто преподавателем.' });
    if (!practical.isOpenFor(user)) {
      const win = practical.windowState();
      return res.status(423).json({ error: `Практическая откроется ${win.opensAt ? fmtTime(win.opensAt) : 'позже'} (+05).` });
    }
    try {
      res.json(handler(req, user));
    } catch (err) {
      if (!(err instanceof course.LinuxCourseError)) throw err;
      res.status(err.status).json({ error: err.message });
    }
  };
}

router.get(`${BASE}/practical/api/me`, requireRole('student'), practicalApi((req, user) => practical.view(user)));
router.post(`${BASE}/practical/api/check`, requireRole('student'), practicalApi((req, user) => practical.checkStep(user, req.body && req.body.stepId, req.body)));

router.get(`${BASE}/mission/:id`, ...page, (req, res) => {
  const status = course.missionStatus(req.session.user, req.params.id);
  if (!status) return res.status(404).render('404');
  if (!status.open) return res.redirect(BASE);
  res.render('linux-course/practice', {
    user: req.session.user,
    base: BASE,
    missionId: req.params.id,
    pageTitle: `${status.moduleNumber}.${status.number}. ${status.title} · ${course.LINUX_TITLE}`,
  });
});

// API: JSON вместо перенаправлений.
function api(handler) {
  return (req, res) => {
    const user = req.session.user;
    res.set('Cache-Control', 'no-store');
    if (!user) return res.status(401).json({ error: 'Войдите на сайт заново.' });
    if (user.mustChangePassword) return res.status(401).json({ error: 'Сначала смените пароль.' });
    if (!course.canSeeLinux(user)) return res.status(404).json({ error: 'Предмет недоступен.' });
    const lock = examLockFor(user);
    if (lock) return res.status(423).json({ error: lock.during ? 'Закрыто на время итоговой контрольной.' : 'Закрыто преподавателем.' });
    const status = course.missionStatus(user, req.params.id);
    if (!status) return res.status(404).json({ error: 'Миссия не найдена.' });
    if (!status.open) return res.status(403).json({ error: 'Миссия ещё не открыта.' });
    try {
      res.json(handler(req, user));
    } catch (err) {
      if (!(err instanceof course.LinuxCourseError)) throw err;
      res.status(err.status).json({ error: err.message });
    }
  };
}

router.get(`${BASE}/api/:id/me`, requireRole('student'), api((req, user) => course.missionView(user, req.params.id)));
router.post(`${BASE}/api/:id/check`, requireRole('student'), api((req, user) => course.check(user, req.params.id, req.body)));
router.post(`${BASE}/api/:id/hint`, requireRole('student'), api((req, user) => { course.markHint(user, req.params.id); return { ok: true }; }));
router.post(`${BASE}/api/:id/event`, requireRole('student'), api((req, user) => course.recordEvent(user, req.params.id, req.body)));

module.exports = router;
