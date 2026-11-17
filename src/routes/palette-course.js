// Предмет «Цвет и палитра» (src/lib/palette-course/): обзор предмета, теория темы, страница задачи (условие +
// готовый шаблон без цвета слева, редактор CSS и пипетка справа — public/js/palette-course.js) + её API.
// Mounted before `student`, чтобы /subjects/palette/... не перехватывалось /subjects/:key. Во время итоговой
// контрольной закрыт, как остальная практика.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { blockDuringExam } = require('../middleware/exam-lock');
const { examLockFor } = require('../lib/exam');
const { buildSidebarTree } = require('../lib/sidebar');
const { renderTheory, renderStatement } = require('../lib/palette-course/theory');
const course = require('../lib/palette-course');

const router = express.Router();
const BASE = course.SUBJECT_BASE;
const RESERVED = ['theory', 'practice', 'event'];

function requireVisible(req, res, next) {
  if (!course.canSeeSubject(req.session.user)) return res.status(404).render('404');
  next();
}
const page = [requireRole('student'), requireVisible, blockDuringExam];

function common(req, activePath) {
  const user = req.session.user;
  return {
    user,
    sidebarTree: buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: course.SUBJECT_KEY }),
    activeAssignmentId: null, activePath, base: BASE, subjectTitle: course.SUBJECT_TITLE,
  };
}

function findTopic(req, res, step) {
  const topic = course.topicFor(req.session.user, req.params.topic);
  if (!topic || !topic.ready) { res.status(404).render('404'); return null; }
  if (topic.adminLocked) {
    res.status(423).render('topic-locked', { user: req.session.user, state: { locked: true, overdue: topic.overdue, reason: topic.lockReason, note: '' } });
    return null;
  }
  if (!(step === 'theory' ? topic.theoryOpen : topic.practiceOpen)) { res.redirect(BASE); return null; }
  return topic;
}

router.get(BASE, ...page, (req, res) => {
  const summary = course.summaryForStudent(req.session.user);
  res.render('palette-course/index', { ...common(req, BASE), summary });
});

router.get(`${BASE}/:topic/theory`, ...page, (req, res) => {
  const topic = findTopic(req, res, 'theory');
  if (!topic) return;
  course.markTheoryRead(req.session.user, topic.key);
  const fresh = course.topicFor(req.session.user, topic.key);
  res.render('palette-course/theory', { ...common(req, `${BASE}/${topic.key}/theory`), topic: fresh, html: renderTheory(course.TOPIC_BY_KEY.get(topic.key).theoryMd) });
});

router.get(`${BASE}/:topic/practice`, ...page, (req, res) => {
  const topic = findTopic(req, res, 'practice');
  if (!topic) return;
  const next = topic.tasks.find((t) => !t.solved) || topic.tasks[0];
  res.redirect(`${BASE}/${topic.key}/${next.id}`);
});

router.get(`${BASE}/:topic/:task`, ...page, (req, res) => {
  if (RESERVED.includes(req.params.task)) return res.status(404).render('404');
  const topic = findTopic(req, res, 'practice');
  if (!topic) return;
  const task = course.TASK_BY_ID.get(req.params.task);
  if (!task || task.topic !== topic.key) return res.status(404).render('404');
  const view = course.taskView(req.session.user, task);
  const index = topic.tasks.findIndex((t) => t.id === task.id);
  res.render('palette-course/task', {
    ...common(req, `${BASE}/${topic.key}/${task.id}`),
    topic, task: view, promptHtml: renderStatement(task.prompt),
    prev: topic.tasks[index - 1] || null, next: topic.tasks[index + 1] || null,
  });
});

// --- API ---
function guard(req, res) {
  const user = req.session.user;
  res.set('Cache-Control', 'no-store');
  if (!user || user.role !== 'student') { res.status(401).json({ error: 'Войдите на сайт заново.' }); return null; }
  if (!course.canSeeSubject(user)) { res.status(404).json({ error: 'Предмет недоступен.' }); return null; }
  const lock = examLockFor(user);
  if (lock) { res.status(423).json({ error: lock.during ? 'Закрыто на время итоговой контрольной.' : 'Закрыто преподавателем.' }); return null; }
  return user;
}

function taskApi(handler) {
  return (req, res) => {
    const user = guard(req, res);
    if (!user) return;
    const topic = course.topicFor(user, req.params.topic);
    const task = course.TASK_BY_ID.get(req.params.task);
    if (!topic || !task || task.topic !== topic.key) return res.status(404).json({ error: 'Такой задачи нет.' });
    if (topic.adminLocked) return res.status(423).json({ error: topic.lockReason || 'Тема закрыта преподавателем.' });
    if (!topic.practiceOpen) return res.status(403).json({ error: 'Сначала откройте теорию темы.' });
    try { res.json(handler(req, user, task)); }
    catch (err) { if (!(err instanceof course.PaletteError)) throw err; res.status(err.status).json({ error: err.message }); }
  };
}

router.post(`${BASE}/:topic/:task/draft`, taskApi((req, user, task) => { course.saveDraft(user, task, req.body && req.body.code); return { ok: true }; }));
router.post(`${BASE}/:topic/:task/check`, taskApi((req, user, task) => course.checkPractice(user, task, req.body)));
router.post(`${BASE}/:topic/:task/event`, taskApi((req, user, task) => course.recordEvent(user, task.id, req.body)));

module.exports = router;
