const {
  getUsers,
  getCourses,
  getAssignments,
  getSubmissions,
  getSqlExercises,
  getAllSqlAttempts,
} = require('../db');
const { TOPICS } = require('./sql-topics');

// Every status the admin UI can show. Status is never conveyed by colour alone —
// each carries an icon and a text label (docs: "Не используй только цвет").
const STATUS_META = {
  pending: { label: 'На проверке', icon: '●', tone: 'pending' },
  resubmitted: { label: 'Пересдача', icon: '↻', tone: 'info' },
  done: { label: 'Выполнено', icon: '✓', tone: 'done' },
  not_done: { label: 'Не выполнено', icon: '×', tone: 'failed' },
  sent_back: { label: 'На пересдаче', icon: '↻', tone: 'warning' },
  overdue: { label: 'Просрочено', icon: '!', tone: 'failed' },
  not_submitted: { label: 'Не сдано', icon: '–', tone: 'muted' },
};

const REVIEW_STATUSES = new Set(['pending', 'resubmitted']);

// Status of a single (latest) submission as the teacher should read it.
function submissionStatusKey(submission) {
  if (submission.status === 'pending') return submission.parentSubmissionId ? 'resubmitted' : 'pending';
  if (submission.status === 'done') return 'done';
  return submission.resubmitAllowed ? 'sent_back' : 'not_done';
}

function dueTime(assignment) {
  return new Date(assignment.dueDate).getTime();
}

// Same cutoff the student upload route enforces (canSubmit in src/routes/student.js),
// so "Просрочено" here always matches "Приём решений закрыт" on the student side.
function isPastDue(assignment, now = Date.now()) {
  return now > dueTime(assignment);
}

function isAssignedTo(assignment, student) {
  if (assignment.targetType === 'individual') return assignment.targetStudentId === student.id;
  return !assignment.targetGroup || assignment.targetGroup === student.group;
}

function byNewest(a, b) {
  return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
}

// Loads everything once per request; the dataset (a few classes) is small enough that
// joining in JS is simpler and faster than a dozen targeted queries per page.
function loadContext() {
  const users = getUsers();
  const students = users.filter((u) => u.role === 'student').sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const courses = getCourses();
  const assignments = getAssignments();
  const submissions = getSubmissions();

  const userById = new Map(users.map((u) => [u.id, u]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const assignmentById = new Map(assignments.map((a) => [a.id, a]));

  // Newest submission per (assignment, student): a resubmission after a rejection is a
  // new chained row, and the teacher always works with the current attempt.
  // Oldest → newest (stable sort, so equal timestamps keep insertion order and the
  // later row wins — same rule as getLatestSubmission's ORDER BY rowid).
  const latestByPair = new Map();
  for (const s of [...submissions].sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0))) {
    latestByPair.set(`${s.assignmentId}::${s.studentId}`, s);
  }

  const works = [...latestByPair.values()]
    .map((submission) => {
      const assignment = assignmentById.get(submission.assignmentId);
      const student = userById.get(submission.studentId);
      if (!assignment || !student) return null;
      const statusKey = submissionStatusKey(submission);
      const late = !!submission.submittedAt && new Date(submission.submittedAt).getTime() > dueTime(assignment);
      return {
        id: submission.id,
        submission,
        student,
        assignment,
        course: courseById.get(assignment.courseId) || null,
        statusKey,
        status: STATUS_META[statusKey],
        submittedAt: submission.submittedAt,
        late,
      };
    })
    .filter(Boolean)
    .sort(byNewest);

  return { users, students, courses, assignments, submissions, userById, courseById, assignmentById, latestByPair, works };
}

function latestFor(ctx, assignmentId, studentId) {
  return ctx.latestByPair.get(`${assignmentId}::${studentId}`) || null;
}

// Status of a student's work on an assignment, including "nothing submitted" states.
function pairStatusKey(ctx, assignment, student, now = Date.now()) {
  const latest = latestFor(ctx, assignment.id, student.id);
  if (latest) return submissionStatusKey(latest);
  return isPastDue(assignment, now) ? 'overdue' : 'not_submitted';
}

// Oldest first: work that has waited longest is reviewed first, and "Следующая работа"
// walks this same order.
function reviewQueue(ctx) {
  return ctx.works.filter((w) => REVIEW_STATUSES.has(w.statusKey)).sort((a, b) => -byNewest(a, b));
}

function overdueItems(ctx, now = Date.now()) {
  const items = [];
  for (const assignment of ctx.assignments) {
    if (!isPastDue(assignment, now)) continue;
    for (const student of ctx.students) {
      if (isAssignedTo(assignment, student) && !latestFor(ctx, assignment.id, student.id)) {
        items.push({ assignment, student, course: ctx.courseById.get(assignment.courseId) || null });
      }
    }
  }
  return items;
}

function dashboard(ctx) {
  const queue = reviewQueue(ctx);
  return {
    stats: {
      pending: queue.length,
      students: ctx.students.length,
      assignments: ctx.assignments.length,
      overdue: overdueItems(ctx).length,
    },
    queue,
  };
}

const DATE_RANGES = { today: 1, week: 7, month: 30 };

function matchesQuery(q, ...fields) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => f && String(f).toLowerCase().includes(needle));
}

const WORK_TABS = {
  all: () => true,
  review: (w) => REVIEW_STATUSES.has(w.statusKey),
  checked: (w) => w.statusKey === 'done' || w.statusKey === 'not_done',
  resubmissions: (w) => w.statusKey === 'resubmitted' || w.statusKey === 'sent_back',
};

function normalizeWorkFilters(query) {
  const tab = WORK_TABS[query.tab] ? query.tab : 'all';
  return {
    q: (query.q || '').trim(),
    course: query.course || '',
    group: query.group || '',
    status: STATUS_META[query.status] ? query.status : '',
    date: DATE_RANGES[query.date] ? query.date : '',
    tab,
  };
}

function filterWorks(ctx, filters, now = Date.now()) {
  const since = filters.date ? now - DATE_RANGES[filters.date] * 24 * 60 * 60 * 1000 : null;
  const list = ctx.works.filter(
    (w) =>
      WORK_TABS[filters.tab](w) &&
      (!filters.course || w.assignment.courseId === filters.course) &&
      (!filters.group || w.student.group === filters.group) &&
      (!filters.status || w.statusKey === filters.status) &&
      (!since || new Date(w.submittedAt).getTime() >= since) &&
      matchesQuery(filters.q, w.student.name, w.assignment.title, w.course && w.course.title)
  );
  // The review tab reads as a queue (oldest first); every other view is newest first.
  return filters.tab === 'review' ? list.sort((a, b) => -byNewest(a, b)) : list;
}

function tabCounts(ctx) {
  return Object.fromEntries(Object.entries(WORK_TABS).map(([k, fn]) => [k, ctx.works.filter(fn).length]));
}

function assignmentStats(ctx, assignment) {
  const assigned = ctx.students.filter((s) => isAssignedTo(assignment, s));
  let submitted = 0;
  let checked = 0;
  let pending = 0;
  for (const student of assigned) {
    const latest = latestFor(ctx, assignment.id, student.id);
    if (!latest) continue;
    submitted += 1;
    if (latest.status === 'pending') pending += 1;
    else checked += 1;
  }
  return { assigned: assigned.length, submitted, checked, pending };
}

function describeTarget(assignment, userById) {
  if (assignment.targetType === 'individual') {
    const student = userById.get(assignment.targetStudentId);
    return { type: 'Индивидуальное', label: student ? student.name : '—' };
  }
  return { type: 'Групповое', label: assignment.targetGroup ? `Группа ${assignment.targetGroup}` : 'Все группы' };
}

function assignmentRows(ctx, filters) {
  return ctx.assignments
    .map((a) => ({
      assignment: a,
      course: ctx.courseById.get(a.courseId) || null,
      target: describeTarget(a, ctx.userById),
      stats: assignmentStats(ctx, a),
      pastDue: isPastDue(a),
    }))
    .filter(
      (r) =>
        (!filters.course || r.assignment.courseId === filters.course) &&
        (!filters.type || r.assignment.targetType === filters.type) &&
        (!filters.state ||
          (filters.state === 'review' && r.stats.pending > 0) ||
          (filters.state === 'open' && !r.pastDue) ||
          (filters.state === 'closed' && r.pastDue)) &&
        matchesQuery(filters.q, r.assignment.title, r.course && r.course.title)
    )
    .sort((a, b) => (a.assignment.dueDate < b.assignment.dueDate ? -1 : 1));
}

function assignmentDetail(ctx, assignment) {
  const rows = ctx.students
    .filter((s) => isAssignedTo(assignment, s))
    .map((student) => {
      const latest = latestFor(ctx, assignment.id, student.id);
      const statusKey = pairStatusKey(ctx, assignment, student);
      return { student, submission: latest, statusKey, status: STATUS_META[statusKey] };
    });
  return {
    assignment,
    course: ctx.courseById.get(assignment.courseId) || null,
    target: describeTarget(assignment, ctx.userById),
    stats: assignmentStats(ctx, assignment),
    pastDue: isPastDue(assignment),
    rows,
  };
}

function lastSqlActivityByStudent() {
  const map = new Map();
  for (const attempt of getAllSqlAttempts()) {
    const prev = map.get(attempt.studentId);
    if (!prev || attempt.createdAt > prev) map.set(attempt.studentId, attempt.createdAt);
  }
  return map;
}

function studentRows(ctx, filters) {
  const sqlActivity = lastSqlActivityByStudent();
  return ctx.students
    .filter((s) => (!filters.group || s.group === filters.group) && matchesQuery(filters.q, s.name, s.id, s.group))
    .map((student) => {
      const assigned = ctx.assignments.filter((a) => isAssignedTo(a, student));
      let done = 0;
      let pending = 0;
      let lastActivity = sqlActivity.get(student.id) || null;
      for (const a of assigned) {
        const latest = latestFor(ctx, a.id, student.id);
        if (!latest) continue;
        if (latest.status === 'done') done += 1;
        if (latest.status === 'pending') pending += 1;
        if (!lastActivity || (latest.submittedAt && latest.submittedAt > lastActivity)) lastActivity = latest.submittedAt;
      }
      return { student, assigned: assigned.length, done, pending, lastActivity };
    });
}

function trainerProgressForStudent(studentId) {
  const exercises = getSqlExercises();
  const solved = new Set(
    getAllSqlAttempts()
      .filter((a) => a.studentId === studentId && a.isCorrect)
      .map((a) => a.exerciseId)
  );
  return { solved: exercises.filter((e) => solved.has(e.id)).length, total: exercises.length };
}

function studentProfile(ctx, student) {
  const assignments = ctx.assignments
    .filter((a) => isAssignedTo(a, student))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .map((assignment) => {
      const statusKey = pairStatusKey(ctx, assignment, student);
      return {
        assignment,
        course: ctx.courseById.get(assignment.courseId) || null,
        submission: latestFor(ctx, assignment.id, student.id),
        statusKey,
        status: STATUS_META[statusKey],
      };
    });
  const history = ctx.submissions
    .filter((s) => s.studentId === student.id)
    .sort(byNewest)
    .map((submission) => {
      const statusKey = submissionStatusKey(submission);
      return { submission, assignment: ctx.assignmentById.get(submission.assignmentId), statusKey, status: STATUS_META[statusKey] };
    })
    .filter((h) => h.assignment);
  const done = assignments.filter((a) => a.statusKey === 'done').length;
  return { student, assignments, history, done, total: assignments.length, trainer: trainerProgressForStudent(student.id) };
}

function courseRows(ctx) {
  return ctx.courses.map((course) => {
    const assignments = ctx.assignments.filter((a) => a.courseId === course.id);
    const studentIds = new Set();
    let pending = 0;
    for (const a of assignments) {
      for (const s of ctx.students) if (isAssignedTo(a, s)) studentIds.add(s.id);
      pending += assignmentStats(ctx, a).pending;
    }
    return { course, teacher: ctx.userById.get(course.teacherId) || null, assignments: assignments.length, students: studentIds.size, pending };
  });
}

function courseDetail(ctx, course) {
  const rows = assignmentRows(ctx, { course: course.id });
  const summary = courseRows(ctx).find((r) => r.course.id === course.id);
  return { ...summary, rows };
}

function trainerOverview(ctx, filters) {
  const exercises = getSqlExercises();
  const attempts = getAllSqlAttempts();
  const topics = TOPICS.map((t) => ({ ...t, exercises: exercises.filter((e) => e.topic === t.key) })).filter(
    (t) => t.exercises.length > 0
  );
  const solvedByStudent = new Map();
  const lastByStudent = new Map();
  for (const a of attempts) {
    if (a.isCorrect) {
      if (!solvedByStudent.has(a.studentId)) solvedByStudent.set(a.studentId, new Set());
      solvedByStudent.get(a.studentId).add(a.exerciseId);
    }
    if (!lastByStudent.has(a.studentId) || a.createdAt > lastByStudent.get(a.studentId)) lastByStudent.set(a.studentId, a.createdAt);
  }
  const rows = ctx.students
    .filter((s) => (!filters.group || s.group === filters.group) && matchesQuery(filters.q, s.name, s.group))
    .map((student) => {
      const solved = solvedByStudent.get(student.id) || new Set();
      return {
        student,
        solved: exercises.filter((e) => solved.has(e.id)).length,
        byTopic: topics.map((t) => ({ key: t.key, solved: t.exercises.filter((e) => solved.has(e.id)).length, total: t.exercises.length })),
        lastActivity: lastByStudent.get(student.id) || null,
      };
    });
  return { topics, rows, totalExercises: exercises.length, attemptCount: attempts.length };
}

// Per-exercise matrix (student × exercise), exercises grouped under their topic.
function trainerMatrix(ctx, filters) {
  const exercises = getSqlExercises();
  const attempts = getAllSqlAttempts();
  const topics = TOPICS.map((t) => ({ ...t, exercises: exercises.filter((e) => e.topic === t.key) })).filter(
    (t) => t.exercises.length > 0
  );
  const byPair = new Map();
  for (const a of attempts) {
    const key = `${a.studentId}::${a.exerciseId}`;
    const cell = byPair.get(key) || { attempts: 0, errors: 0, solved: false };
    cell.attempts += 1;
    if (a.isError) cell.errors += 1;
    if (a.isCorrect) cell.solved = true;
    byPair.set(key, cell);
  }
  const rows = ctx.students
    .filter((s) => (!filters.group || s.group === filters.group) && matchesQuery(filters.q, s.name, s.group))
    .map((student) => {
      const cells = exercises.map((ex) => ({
        exercise: ex,
        ...(byPair.get(`${student.id}::${ex.id}`) || { attempts: 0, errors: 0, solved: false }),
      }));
      return { student, cells, solved: cells.filter((c) => c.solved).length };
    });
  return { topics, exercises, rows };
}

function search(ctx, q) {
  const query = (q || '').trim();
  if (!query) return { query, students: [], assignments: [], courses: [], works: [] };
  return {
    query,
    students: ctx.students.filter((s) => matchesQuery(query, s.name, s.id, s.group)).slice(0, 8),
    assignments: ctx.assignments.filter((a) => matchesQuery(query, a.title)).slice(0, 8),
    courses: ctx.courses.filter((c) => matchesQuery(query, c.title)).slice(0, 5),
    works: ctx.works.filter((w) => matchesQuery(query, w.student.name, w.assignment.title)).slice(0, 8),
  };
}

// Next work in the review queue after `currentId`; wraps to the start, and skips the
// current work (it may still be in the queue if it wasn't saved).
function nextInQueue(ctx, currentId) {
  const queue = reviewQueue(ctx);
  if (queue.length === 0) return null;
  const index = queue.findIndex((w) => w.id === currentId);
  const ordered = index === -1 ? queue : [...queue.slice(index + 1), ...queue.slice(0, index)];
  return ordered.find((w) => w.id !== currentId) || null;
}

module.exports = {
  STATUS_META,
  loadContext,
  submissionStatusKey,
  isAssignedTo,
  isPastDue,
  reviewQueue,
  dashboard,
  normalizeWorkFilters,
  filterWorks,
  tabCounts,
  assignmentRows,
  assignmentDetail,
  studentRows,
  studentProfile,
  courseRows,
  courseDetail,
  trainerOverview,
  trainerMatrix,
  search,
  nextInQueue,
};
