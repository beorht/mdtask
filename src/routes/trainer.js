const express = require('express');
const { requireRole, requireAuth } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { runPreview, checkSolution, getTableSchema, getTableData } = require('../lib/sql-sandbox');
const { getSqlExercises, getSqlAttempts, getSolvedSqlExerciseIds } = require('../db');
const { renderMarkdown } = require('../lib/markdown');
const { TOPIC_THEORY } = require('../content/sql-theory');
const { TOPIC_LABELS, getAllowedTopicKeys, getTopicsForUser } = require('../lib/sql-topics');
const { withProgress } = require('../lib/sql-progress');
const { describeExpected } = require('../lib/sql-expected');
const { hasFullAccess } = require('../lib/test-access');

const router = express.Router();

function exercisesForUser(user) {
  const allowed = getAllowedTopicKeys(user);
  return getSqlExercises().filter((e) => allowed.includes(e.topic));
}

function findExerciseWithProgress(req, res, next) {
  const exercises = withProgress(exercisesForUser(req.session.user), getSolvedSqlExerciseIds(req.session.user.id), hasFullAccess(req.session.user));
  const exercise = exercises.find((e) => e.id === req.params.id);
  if (!exercise) return res.status(404).render('404');
  if (!exercise.unlocked) return res.status(403).render('403');
  req.sqlExercise = { ...exercise, descriptionHtml: renderMarkdown(exercise.descriptionMd) };
  req.sqlExercises = exercises;
  next();
}

function sidebarForRequest(req) {
  const user = req.session.user;
  return buildSidebarTree({
    role: user.role,
    studentId: user.role === 'student' ? user.id : undefined,
    studentGroup: user.role === 'student' ? user.group : undefined,
    subject: 'sql',
  });
}

// --- Theory: overview + one page per topic ---

router.get('/trainer/theory', requireAuth, (req, res) => {
  res.render('trainer/theory-index', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    topics: getTopicsForUser(req.session.user),
    activeAssignmentId: null,
    activePath: '/trainer/theory',
  });
});

router.get('/trainer/theory/:topic', requireAuth, (req, res) => {
  const topic = TOPIC_THEORY[req.params.topic];
  if (!topic || !getAllowedTopicKeys(req.session.user).includes(req.params.topic)) {
    return res.status(404).render('404');
  }

  // "Theory → practice" card at the end of the page: only for topics that have exercises.
  const user = req.session.user;
  const topicExercises = exercisesForUser(user).filter((e) => e.topic === req.params.topic);
  let practice = null;
  if (topicExercises.length > 0) {
    practice = { total: topicExercises.length, solvedCount: 0, unlocked: true, forStudent: user.role === 'student' };
    if (practice.forStudent) {
      const solvedIds = getSolvedSqlExerciseIds(user.id);
      const progress = withProgress(exercisesForUser(user), solvedIds, hasFullAccess(user)).filter((e) => e.topic === req.params.topic);
      practice.solvedCount = progress.filter((e) => e.solved).length;
      practice.unlocked = progress.some((e) => e.unlocked);
    }
  }

  res.render('trainer/theory', {
    user,
    sidebarTree: sidebarForRequest(req),
    topicKey: req.params.topic,
    topicTitle: topic.title,
    html: renderMarkdown(topic.md),
    practice,
    activeAssignmentId: null,
    activePath: `/trainer/theory/${req.params.topic}`,
  });
});

// --- Practice: overview + one list per topic + individual exercise pages ---

router.get('/trainer', requireRole('student'), (req, res) => {
  const solvedIds = getSolvedSqlExerciseIds(req.session.user.id);
  const exercises = withProgress(exercisesForUser(req.session.user), solvedIds, hasFullAccess(req.session.user));

  const topics = getTopicsForUser(req.session.user)
    .map((topic) => {
      const topicExercises = exercises.filter((e) => e.topic === topic.key);
      return {
        ...topic,
        solvedCount: topicExercises.filter((e) => e.solved).length,
        total: topicExercises.length,
        unlocked: topicExercises.some((e) => e.unlocked),
      };
    })
    // Theory-only topics have no exercises to practice — leave them out of the practice list.
    .filter((topic) => topic.total > 0);

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
  if (!TOPIC_LABELS[topicKey] || !getAllowedTopicKeys(req.session.user).includes(topicKey)) {
    return res.status(404).render('404');
  }

  const exercises = withProgress(exercisesForUser(req.session.user), getSolvedSqlExerciseIds(req.session.user.id), hasFullAccess(req.session.user)).filter(
    (e) => e.topic === topicKey
  );
  if (exercises.length === 0) return res.status(404).render('404'); // theory-only topic, no practice list

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
  const data = getTableData(req.session.user.id, exercise);

  const currentIndex = req.sqlExercises.findIndex((e) => e.id === exercise.id);
  const next = req.sqlExercises[currentIndex + 1] || null;

  res.render('trainer/exercise', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercise,
    topicLabel: TOPIC_LABELS[exercise.topic],
    expected: describeExpected(exercise),
    attempts,
    schema,
    data,
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
  const data = getTableData(req.session.user.id, exercise);
  const currentIndex = req.sqlExercises.findIndex((e) => e.id === exercise.id);
  const next = req.sqlExercises[currentIndex + 1] || null;

  res.render('trainer/exercise', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercise,
    topicLabel: TOPIC_LABELS[exercise.topic],
    expected: describeExpected(exercise),
    attempts,
    schema,
    data,
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
  const exercises = withProgress(exercisesForUser(req.session.user), solvedIds, hasFullAccess(req.session.user));
  const attempts = getSqlAttempts(exercise.id, req.session.user.id);
  const schema = getTableSchema(req.session.user.id, exercise);
  const data = getTableData(req.session.user.id, exercise);
  const currentIndex = exercises.findIndex((e) => e.id === exercise.id);
  const next = exercises[currentIndex + 1] || null;

  res.render('trainer/exercise', {
    user: req.session.user,
    sidebarTree: sidebarForRequest(req),
    exercise: { ...exercise, solved: solvedIds.has(exercise.id) },
    topicLabel: TOPIC_LABELS[exercise.topic],
    expected: describeExpected(exercise),
    attempts,
    schema,
    data,
    next,
    runResult: null,
    submitResult,
    submittedSql: sql,
    activeAssignmentId: null,
    activePath: `/trainer/practice/${exercise.topic}`,
  });
});

// --- Teacher views moved to the admin panel; old links keep working ---

router.get('/teacher/trainer/results', requireRole('teacher'), (req, res) => res.redirect('/admin/trainer/results'));
router.get('/teacher/trainer/results/:studentId/:exerciseId', requireRole('teacher'), (req, res) =>
  res.redirect(`/admin/trainer/${encodeURIComponent(req.params.studentId)}/${encodeURIComponent(req.params.exerciseId)}`)
);

module.exports = router;
