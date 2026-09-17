const express = require('express');
const { requireRole, requireAuth } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { runPreview, checkSolution, getTableSchema } = require('../lib/sql-sandbox');
const { getSqlExercises, getSqlAttempts, getSolvedSqlExerciseIds, getUsers, getAllSqlAttempts } = require('../db');
const { renderMarkdown } = require('../lib/markdown');
const { TOPIC_THEORY } = require('../content/sql-theory');
const { TOPICS, TOPIC_LABELS } = require('../lib/sql-topics');

const router = express.Router();

function withProgress(exercises, solvedIds) {
  return exercises.map((ex, i) => {
    const prev = exercises[i - 1];
    const unlocked = i === 0 || solvedIds.has(prev.id);
    return { ...ex, solved: solvedIds.has(ex.id), unlocked };
  });
}

function findExerciseWithProgress(req, res, next) {
  const exercises = withProgress(getSqlExercises(), getSolvedSqlExerciseIds(req.session.user.id));
  const exercise = exercises.find((e) => e.id === req.params.id);
  if (!exercise) return res.status(404).render('404');
  if (!exercise.unlocked) return res.status(403).render('403');
  req.sqlExercise = { ...exercise, descriptionHtml: renderMarkdown(exercise.descriptionMd) };
  req.sqlExercises = exercises;
  next();
}

function sidebarForRequest(req) {
  const user = req.session.user;
  return buildSidebarTree({ role: user.role, studentId: user.role === 'student' ? user.id : undefined });
}

// --- Theory: overview + one page per topic ---

router.get('/trainer/theory', requireAuth, (req, res) => {
  res.render('trainer/theory-index', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    topics: TOPICS,
    activeAssignmentId: null,
    activePath: '/trainer/theory',
  });
});

router.get('/trainer/theory/:topic', requireAuth, (req, res) => {
  const topic = TOPIC_THEORY[req.params.topic];
  if (!topic) return res.status(404).render('404');

  res.render('trainer/theory', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    topicKey: req.params.topic,
    topicTitle: topic.title,
    html: renderMarkdown(topic.md),
    activeAssignmentId: null,
    activePath: `/trainer/theory/${req.params.topic}`,
  });
});

// --- Practice: overview + one list per topic + individual exercise pages ---

router.get('/trainer', requireRole('student'), (req, res) => {
  const solvedIds = getSolvedSqlExerciseIds(req.session.user.id);
  const exercises = withProgress(getSqlExercises(), solvedIds);

  const topics = TOPICS.map((topic) => {
    const topicExercises = exercises.filter((e) => e.topic === topic.key);
    return {
      ...topic,
      solvedCount: topicExercises.filter((e) => e.solved).length,
      total: topicExercises.length,
      unlocked: topicExercises.some((e) => e.unlocked),
    };
  });

  res.render('trainer/practice-index', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    topics,
    activeAssignmentId: null,
    activePath: '/trainer',
  });
});

router.get('/trainer/practice/:topic', requireRole('student'), (req, res) => {
  const topicKey = req.params.topic;
  if (!TOPIC_LABELS[topicKey]) return res.status(404).render('404');

  const exercises = withProgress(getSqlExercises(), getSolvedSqlExerciseIds(req.session.user.id)).filter(
    (e) => e.topic === topicKey
  );

  res.render('trainer/practice', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    topicKey,
    topicLabel: TOPIC_LABELS[topicKey],
    exercises,
    activeAssignmentId: null,
    activePath: `/trainer/practice/${topicKey}`,
  });
});

router.get('/trainer/:id', requireRole('student'), findExerciseWithProgress, (req, res) => {
  const exercise = req.sqlExercise;
  const attempts = getSqlAttempts(exercise.id, req.session.user.id);
  const schema = getTableSchema(req.session.user.id, exercise);

  const currentIndex = req.sqlExercises.findIndex((e) => e.id === exercise.id);
  const next = req.sqlExercises[currentIndex + 1] || null;

  res.render('trainer/exercise', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercise,
    topicLabel: TOPIC_LABELS[exercise.topic],
    attempts,
    schema,
    next,
    runResult: null,
    submitResult: null,
    submittedSql: '',
    activeAssignmentId: null,
    activePath: `/trainer/practice/${exercise.topic}`,
  });
});

router.post('/trainer/:id/run', requireRole('student'), findExerciseWithProgress, (req, res) => {
  const exercise = req.sqlExercise;
  const sql = typeof req.body.sql === 'string' ? req.body.sql : '';
  const runResult = runPreview(req.session.user.id, exercise, sql);

  const attempts = getSqlAttempts(exercise.id, req.session.user.id);
  const schema = getTableSchema(req.session.user.id, exercise);
  const currentIndex = req.sqlExercises.findIndex((e) => e.id === exercise.id);
  const next = req.sqlExercises[currentIndex + 1] || null;

  res.render('trainer/exercise', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercise,
    topicLabel: TOPIC_LABELS[exercise.topic],
    attempts,
    schema,
    next,
    runResult,
    submitResult: null,
    submittedSql: sql,
    activeAssignmentId: null,
    activePath: `/trainer/practice/${exercise.topic}`,
  });
});

router.post('/trainer/:id/submit', requireRole('student'), findExerciseWithProgress, (req, res) => {
  const exercise = req.sqlExercise;
  const sql = typeof req.body.sql === 'string' ? req.body.sql : '';
  const submitResult = checkSolution(req.session.user.id, exercise, sql);

  const solvedIds = getSolvedSqlExerciseIds(req.session.user.id);
  const exercises = withProgress(getSqlExercises(), solvedIds);
  const attempts = getSqlAttempts(exercise.id, req.session.user.id);
  const schema = getTableSchema(req.session.user.id, exercise);
  const currentIndex = exercises.findIndex((e) => e.id === exercise.id);
  const next = exercises[currentIndex + 1] || null;

  res.render('trainer/exercise', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercise: { ...exercise, solved: solvedIds.has(exercise.id) },
    topicLabel: TOPIC_LABELS[exercise.topic],
    attempts,
    schema,
    next,
    runResult: null,
    submitResult,
    submittedSql: sql,
    activeAssignmentId: null,
    activePath: `/trainer/practice/${exercise.topic}`,
  });
});

// --- Teacher: results across all students/exercises ---

router.get('/teacher/trainer/results', requireRole('teacher'), (req, res) => {
  const exercises = getSqlExercises();
  const students = getUsers().filter((u) => u.role === 'student');
  const attempts = getAllSqlAttempts();

  const rows = students.map((student) => {
    const studentAttempts = attempts.filter((a) => a.studentId === student.id);
    const cells = exercises.map((ex) => {
      const forExercise = studentAttempts.filter((a) => a.exerciseId === ex.id);
      const solved = forExercise.some((a) => a.isCorrect);
      const errors = forExercise.filter((a) => a.isError).length;
      return { exerciseId: ex.id, attempts: forExercise.length, errors, solved };
    });
    const solvedCount = cells.filter((c) => c.solved).length;
    return { student, cells, solvedCount };
  });

  res.render('trainer/results', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercises,
    rows,
    activeAssignmentId: null,
    activePath: '/teacher/trainer/results',
  });
});

router.get('/teacher/trainer/results/:studentId/:exerciseId', requireRole('teacher'), (req, res) => {
  const student = getUsers().find((u) => u.id === req.params.studentId && u.role === 'student');
  const exercise = getSqlExercises().find((e) => e.id === req.params.exerciseId);
  if (!student || !exercise) return res.status(404).render('404');

  const attempts = getSqlAttempts(exercise.id, student.id);

  res.render('trainer/attempt-history', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    student,
    exercise: { ...exercise, descriptionHtml: renderMarkdown(exercise.descriptionMd) },
    topicLabel: TOPIC_LABELS[exercise.topic],
    attempts,
    activeAssignmentId: null,
    activePath: '/teacher/trainer/results',
  });
});

module.exports = router;
