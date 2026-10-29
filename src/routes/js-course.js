// Курс «JavaScript: от синтаксиса до DOM» (src/lib/js-course/): обзор курса, теория урока, страница задачи (условие слева,
// редактор справа — public/js/js-course.js) и её API: черновик, проверка, события. Mounted before `student`
// so /subjects/javascript/course isn't taken by /subjects/:key/... Во время итоговой контрольной закрыт, как остальная практика.
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { blockDuringExam } = require('../middleware/exam-lock');
const { examLockFor } = require('../lib/exam');
const { buildSidebarTree } = require('../lib/sidebar');
const { renderTheory, renderStatement } = require('../lib/js-course/theory');
const course = require('../lib/js-course');

const router = express.Router();
const BASE = course.COURSE_BASE;

function requireVisible(req, res, next) {
  if (!course.canSeeCourse(req.session.user)) return res.status(404).render('404');
  next();
}

const page = [requireRole('student'), requireVisible, blockDuringExam];

function sidebar(user) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject: 'javascript' });
}

function common(req, activePath) {
  const user = req.session.user;
  return { user, sidebarTree: sidebar(user), activeAssignmentId: null, activePath, base: BASE, courseTitle: course.COURSE_TITLE };
}

// Урок из адреса: 404, если его нет или он не готов; закрытый — обратно на страницу курса.
function findLesson(req, res, step) {
  const lesson = course.lessonFor(req.session.user, req.params.lesson);
  if (!lesson || !lesson.ready) {
    res.status(404).render('404');
    return null;
  }
  if (!(step === 'theory' ? lesson.theoryOpen : lesson.practiceOpen)) {
    res.redirect(BASE);
    return null;
  }
  return lesson;
}

// Курс — основное содержимое предмета JavaScript: обзор курса живёт на странице /subjects/javascript.
router.get(BASE, ...page, (req, res) => res.redirect('/subjects/javascript#course'));

router.get(`${BASE}/:lesson/theory`, ...page, (req, res) => {
  const lesson = findLesson(req, res, 'theory');
  if (!lesson) return;
  course.markTheoryRead(req.session.user, lesson.key);
  const fresh = course.lessonFor(req.session.user, lesson.key);
  res.render('js-course/theory', {
    ...common(req, `${BASE}/${lesson.key}/theory`),
    lesson: fresh,
    html: renderTheory(course.LESSON_BY_KEY.get(lesson.key).theoryMd),
  });
});

// Практика урока — первая нерешённая задача (или первая, если решены все).
router.get(`${BASE}/:lesson/practice`, ...page, (req, res) => {
  const lesson = findLesson(req, res, 'practice');
  if (!lesson) return;
  const next = lesson.tasks.find((t) => !t.solved) || lesson.tasks[0];
  res.redirect(`${BASE}/${lesson.key}/${next.id}`);
});

router.get(`${BASE}/:lesson/:task`, ...page, (req, res) => {
  const lesson = findLesson(req, res, 'practice');
  if (!lesson) return;
  const task = course.TASK_BY_ID.get(req.params.task);
  if (!task || task.lesson !== lesson.key) return res.status(404).render('404');
  const view = course.taskView(req.session.user, task);
  const index = lesson.tasks.findIndex((t) => t.id === task.id);
  res.render('js-course/task', {
    ...common(req, `${BASE}/${lesson.key}/${task.id}`),
    lesson,
    task: view,
    statementHtml: renderStatement(task.statement),
    prev: lesson.tasks[index - 1] || null,
    next: lesson.tasks[index + 1] || null,
  });
});

// API задачи: JSON вместо перенаправлений.
function api(handler) {
  return (req, res) => {
    const user = req.session.user;
    res.set('Cache-Control', 'no-store');
    if (!user || user.role !== 'student') return res.status(401).json({ error: 'Войдите на сайт заново.' });
    if (!course.canSeeCourse(user)) return res.status(404).json({ error: 'Курс недоступен.' });
    const lock = examLockFor(user);
    if (lock) return res.status(423).json({ error: lock.during ? 'Закрыто на время итоговой контрольной.' : 'Закрыто преподавателем.' });
    const lesson = course.lessonFor(user, req.params.lesson);
    const task = course.TASK_BY_ID.get(req.params.task);
    if (!lesson || !task || task.lesson !== lesson.key) return res.status(404).json({ error: 'Такой задачи нет.' });
    if (!lesson.practiceOpen) return res.status(403).json({ error: 'Сначала прочитайте теорию урока.' });
    try {
      res.json(handler(req, user, task));
    } catch (err) {
      if (!(err instanceof course.JsCourseError)) throw err;
      res.status(err.status).json({ error: err.message });
    }
  };
}

router.post(`${BASE}/:lesson/:task/draft`, api((req, user, task) => {
  course.saveDraft(user, task, req.body && req.body.code);
  return { ok: true };
}));
router.post(`${BASE}/:lesson/:task/check`, api((req, user, task) => course.checkTask(user, task, req.body)));
router.post(`${BASE}/:lesson/:task/event`, api((req, user, task) => course.recordEvent(user, task, req.body)));

module.exports = router;
