// «Web-разработка: CSS» (src/lib/css-course/): страница предмета, теория темы, окно практической работы
// (public/js/css-course.js, проверка public/js/css-check.js) и его API. Mounted before `student` so /subjects/css isn't taken by
// /subjects/:key. Во время итоговой контрольной группы (examLockFor) закрыт, как остальная практика.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { blockDuringExam } = require('../middleware/exam-lock');
const { examLockFor } = require('../lib/exam');
const { buildSidebarTree } = require('../lib/sidebar');
const { renderTheory } = require('../lib/css-course/theory');
const course = require('../lib/css-course');

const router = express.Router();
const BASE = `/subjects/${course.CSS_KEY}`;

function requireVisible(req, res, next) {
  if (!course.canSeeCss(req.session.user)) return res.status(404).render('404');
  next();
}

const page = [requireRole('student'), requireVisible, blockDuringExam];

function sidebar(user) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: course.CSS_KEY });
}

// Тема из адреса: 404, если её нет или она ещё не готова; на закрытую — обратно на страницу предмета.
function findTopic(req, res, step) {
  const topic = course.topicFor(req.session.user, req.params.topic);
  if (!topic || !topic.ready) {
    res.status(404).render('404');
    return null;
  }
  if (!(step === 'theory' ? topic.theoryOpen : topic.practiceOpen)) {
    res.redirect(BASE);
    return null;
  }
  return topic;
}

router.get(BASE, ...page, (req, res) => {
  const user = req.session.user;
  res.render('css-course/index', {
    user,
    sidebarTree: sidebar(user),
    activeAssignmentId: null,
    activePath: BASE,
    title: course.CSS_TITLE,
    base: BASE,
    summary: course.summaryForStudent(user),
  });
});

router.get(`${BASE}/:topic/theory`, ...page, (req, res) => {
  const topic = findTopic(req, res, 'theory');
  if (!topic) return;
  const user = req.session.user;
  course.markTheoryRead(user, topic.key);
  res.render('css-course/theory', {
    user,
    sidebarTree: sidebar(user),
    activeAssignmentId: null,
    activePath: `${BASE}/${topic.key}/theory`,
    title: course.CSS_TITLE,
    base: BASE,
    topic,
    html: renderTheory(course.TOPIC_BY_KEY.get(topic.key).theoryMd),
  });
});

router.get(`${BASE}/:topic/practice`, ...page, (req, res) => {
  const topic = findTopic(req, res, 'practice');
  if (!topic) return;
  res.render('css-course/practice', { user: req.session.user, topic, base: BASE, pageTitle: `${topic.number}.2. ${topic.title}` });
});

// API: JSON вместо перенаправлений.
function api(handler) {
  return (req, res) => {
    const user = req.session.user;
    res.set('Cache-Control', 'no-store');
    if (!user) return res.status(401).json({ error: 'Войдите на сайт заново.' });
    if (user.mustChangePassword) return res.status(401).json({ error: 'Сначала смените пароль.' });
    if (!course.canSeeCss(user)) return res.status(404).json({ error: 'Предмет недоступен.' });
    const lock = examLockFor(user);
    if (lock) return res.status(423).json({ error: lock.during ? 'Закрыто на время итоговой контрольной.' : 'Закрыто преподавателем.' });
    const topic = course.topicFor(user, req.params.topic);
    if (!topic || !topic.ready) return res.status(404).json({ error: 'Такой темы нет.' });
    if (!topic.practiceOpen) return res.status(403).json({ error: 'Сначала прочитайте теорию темы.' });
    try {
      res.json(handler(req, user, topic));
    } catch (err) {
      if (!(err instanceof course.CssCourseError)) throw err;
      res.status(err.status).json({ error: err.message });
    }
  };
}

router.get(`${BASE}/api/:topic/me`, api((req, user, topic) => course.me(user, topic.key)));
router.post(`${BASE}/api/:topic/events`, api((req, user, topic) => course.recordEvent(user, topic.key, req.body)));

module.exports = router;
