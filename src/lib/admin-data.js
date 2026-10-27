const {
  getUsers,
  getCourses,
  getAssignments,
  getSubmissions,
  getSqlExercises,
  getAllSqlAttempts,
  getCaesarSecrets,
  getConfigTasks,
  getTerminalTasks,
  getTerminalLog,
  getLabTasks,
  getLabLog,
  getLogsDetectors,
  getLogsDetector,
  getIbGuardCounts,
  getIbGuardEvents,
  getIbTaskDefenses,
  getIbTaskDefense,
} = require('../db');
const { TOPICS } = require('./sql-topics');
const { mistakesByExercise } = require('./sql-mistakes');
const { TEST_GROUP, seesSharedAssignments } = require('./test-access');
const { findIbTask, IB_TASKS } = require('./ib-tasks');

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
  // Information security task №4: some of the autocheck items already pass.
  in_progress: { label: 'В процессе', icon: '◐', tone: 'info' },
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
  if (student.group === TEST_GROUP) return true;
  return assignment.targetGroup ? assignment.targetGroup === student.group : seesSharedAssignments(student.group);
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
    ib: ibDashboard(),
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
  return {
    student,
    assignments,
    history,
    done,
    total: assignments.length,
    trainer: trainerProgressForStudent(student.id),
    ib: ibProgressForStudent(student.id),
  };
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

// Most common mistakes per trainer exercise (src/lib/sql-mistakes.js), for the students under
// the filters; topic narrows the exercises. Exercises are grouped under their topic.
function trainerMistakes(ctx, filters) {
  const studentIds = new Set(
    ctx.students.filter((s) => (!filters.group || s.group === filters.group) && matchesQuery(filters.q, s.name, s.group)).map((s) => s.id)
  );
  const exercises = getSqlExercises().filter((e) => !filters.topic || e.topic === filters.topic);
  const attempts = getAllSqlAttempts().filter((a) => studentIds.has(a.studentId));
  const stats = mistakesByExercise(exercises, attempts);
  const topics = TOPICS.map((t) => ({ ...t, rows: stats.filter((s) => s.exercise.topic === t.key) })).filter((t) => t.rows.length > 0);
  return { topics, exerciseCount: stats.length };
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

// --- Information security (ib/): task №3 «Доступ к защищённой базе данных» ---
// One row per student the task was generated for, with the answers (password, hidden file).
function ibResults(ctx, filters) {
  const studentById = new Map(ctx.students.map((s) => [s.id, s]));
  const q = (filters.q || '').toLowerCase();
  const rows = getCaesarSecrets()
    .map((secret) => ({ secret, student: studentById.get(secret.student_id) }))
    .filter((r) => r.student)
    .filter((r) => !filters.group || r.student.group === filters.group)
    .filter((r) => !q || r.student.name.toLowerCase().includes(q) || r.student.id.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        b.secret.solved - a.secret.solved ||
        String(a.secret.solved_at || '').localeCompare(String(b.secret.solved_at || '')) ||
        a.student.name.localeCompare(b.student.name, 'ru')
    );
  attachSignals('caesar', rows, () => ({}));
  return {
    rows,
    total: rows.length,
    solved: rows.filter((r) => r.secret.solved).length,
    picked: filters.pick === 'caesar' ? pickForOral(rows, 4, Math.random, (r) => r.secret.solved) : null,
  };
}

// Task №4 «Поиск и правка конфигурационных файлов»: progress of the terminal autocheck
// (passed / total required checks) and the student's own target values.
function ibConfigResults(ctx, filters) {
  const studentById = new Map(ctx.students.map((s) => [s.id, s]));
  const q = (filters.q || '').toLowerCase();
  const rows = getConfigTasks()
    .map((task) => ({ task, student: studentById.get(task.student_id) }))
    .filter((r) => r.student)
    .filter((r) => !filters.group || r.student.group === filters.group)
    .filter((r) => !q || r.student.name.toLowerCase().includes(q) || r.student.id.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        b.task.solved - a.task.solved ||
        b.task.passed - a.task.passed ||
        String(a.task.solved_at || '').localeCompare(String(b.task.solved_at || '')) ||
        a.student.name.localeCompare(b.student.name, 'ru')
    );
  attachSignals('configs', rows, () => ({}));
  return {
    rows,
    total: rows.length,
    solved: rows.filter((r) => r.task.solved).length,
    picked: filters.pick === 'configs' ? pickForOral(rows, 4, Math.random, (r) => r.task.passed > 0) : null,
    started: rows.filter((r) => !r.task.solved && r.task.passed > 0).length,
  };
}

// Task №5 «Основы работы в терминале Linux» (step-by-step trainer): stages passed, the stage the
// student is on, wrong answers and activity from the command log.
const TERMINAL_STAGES = findIbTask('terminal').stages;

function wrongAnswers(progress) {
  const attempts = progress.attempts || {};
  const answers = progress.answers || {};
  return Object.keys(attempts).reduce((sum, q) => sum + attempts[q] - (answers[q] && answers[q].ok ? 1 : 0), 0);
}

// Step-by-step tasks (№5 trainer and the lab_task.py ones): rows with the stage the student is on,
// wrong answers and activity from the command log.
function stageTaskResults(ctx, filters, tasks, stages, info) {
  const studentById = new Map(ctx.students.map((s) => [s.id, s]));
  const q = (filters.q || '').toLowerCase();
  const rows = tasks
    .map((task) => ({
      task,
      student: studentById.get(task.student_id),
      currentStage: task.solved ? null : stages[Math.min(task.passed, stages.length - 1)],
      wrongAnswers: wrongAnswers(task.progress),
      info: info ? info(task.params) : null,
    }))
    .filter((r) => r.student)
    .filter((r) => !filters.group || r.student.group === filters.group)
    .filter((r) => !q || r.student.name.toLowerCase().includes(q) || r.student.id.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        b.task.solved - a.task.solved ||
        b.task.passed - a.task.passed ||
        String(a.task.solved_at || '').localeCompare(String(b.task.solved_at || '')) ||
        a.student.name.localeCompare(b.student.name, 'ru')
    );
  return {
    rows,
    total: rows.length,
    solved: rows.filter((r) => r.task.solved).length,
    started: rows.filter((r) => !r.task.solved && (r.task.passed > 0 || r.task.commands > 0)).length,
  };
}

function stageTaskDetail(student, task, stagesList, log, meta) {
  const progress = task.progress || {};
  const completed = progress.completed_at || {};
  const stages = stagesList.map((title, i) => ({
    number: i + 1,
    title,
    done: i < task.passed,
    current: !task.solved && i === task.passed,
    completedAt: completed[String(i + 1)] || null,
  }));
  const attempts = progress.attempts || {};
  const answered = progress.answers || {};
  const answers = Object.keys({ ...attempts, ...answered })
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
    .map((qid) => ({
      qid,
      attempts: attempts[qid] || 0,
      ok: !!(answered[qid] && answered[qid].ok),
      value: answered[qid] ? answered[qid].value : null,
      at: answered[qid] ? answered[qid].at : null,
    }));
  return { student, task, stages, answers, wrongAnswers: wrongAnswers(progress), log, meta };
}

function ibTerminalResults(ctx, filters) {
  const res = stageTaskResults(ctx, filters, getTerminalTasks(), TERMINAL_STAGES);
  attachSignals('terminal', res.rows, (r) => r.task.progress || {});
  if (filters.pick === 'terminal') res.picked = pickForOral(res.rows);
  return res;
}

function ibTerminalDetail(ctx, studentId) {
  const student = ctx.students.find((s) => s.id === studentId);
  const task = getTerminalTasks().find((t) => t.student_id === studentId);
  if (!student || !task) return null;
  const meta = {
    number: 5,
    title: findIbTask('terminal').title,
    total: 14,
    checkCommand: `python3 ib/checks/task5_check.py ${studentId} --text`,
  };
  const detail = stageTaskDetail(student, task, TERMINAL_STAGES, getTerminalLog(studentId), meta);
  detail.integrity = integrityDetail('terminal', studentId, task.progress || {});
  return detail;
}

// Personal values shown next to each student on /admin/ib (what the teacher needs to grade the report).
const LAB_INFO = {
  incident: (p) => `${p.target} · ${p.attacker_ip} · ${p.attack_failed} попыток · вход ${p.login_time}`,
  ssh: (p) => `порт ${p.port}`,
  logs: (p) => `${p.service || ''} · ${p.target} · SSH ${p.ssh_ip} · веб ${p.web_ip}`,
  grep: (p) => `${p.svc} · ${p.emp} · ${p.domain}`,
};

const GUARD_LABELS = {
  paste_blocked: 'вставка заблокирована',
  drop_blocked: 'перетаскивание заблокировано',
  copy: 'копирование',
  hidden: 'ушёл со страницы',
  autotype: 'команда набрана без нажатий клавиш или слишком быстро',
  trap: 'команда с каталогом из текста-ловушки',
};

// Signals block of a student's detail page (any IB task with the stage engine or the №5 trainer).
function integrityDetail(key, studentId, progress) {
  const guard = getIbGuardCounts(key).get(studentId) || {};
  const events = getIbGuardEvents(key, studentId, 50).map((g) => {
    const data = JSON.parse(g.data || '{}');
    return { ...g, data, label: GUARD_LABELS[g.type] || g.type };
  });
  const defense = Object.entries(progress.defense || {})
    .filter(([, d]) => (d.qs || []).length)
    .map(([k, d]) => ({ stage: Number(k), results: d.results || [], questions: d.qs || [] }));
  return {
    signals: taskSignals(progress, guard, getIbTaskDefense(key, studentId)),
    guard,
    events,
    defense,
    noProof: progress.no_proof || [],
    traps: (progress.traps || []).map((t) => ({ ...t, label: TRAP_LABELS[t.trap] || t.trap })),
  };
}

// №9: per grep task — the accepted command, attempts, time from opening, refusals, the mutation question.
function grepDetail(task) {
  const progress = task.progress || {};
  const info = progress.grep || {};
  const hints = progress.hints || {};
  const meta = findIbTask('grep');
  return meta.stages.map((title, i) => {
    const k = String(i + 1);
    const g = info[k] || {};
    return {
      k: i + 1,
      title,
      cmd: g.cmd || null,
      tries: g.tries || 0,
      seconds: g.seconds === undefined ? null : g.seconds,
      refused: g.refused || 0,
      typed: g.typed || 0,
      hiddenFail: g.hidden_fail || 0,
      hints: hints[k] || 0,
      mutation: g.mut || null,
    };
  });
}

// ---------------------------------------------------------- №8 «logs» ---
// Признаки того, что задание решали не сами (план docs/ib-task8-logs-plan.md, раздел 4):
// ловушечные ответы, ответы без доказательства в выводе команд, неверные контрольные вопросы,
// попытки вставки. Вес — для выбора студентов на устную проверку.

const TRAP_LABELS = {
  clip_ip: 'адрес из текста-ловушки, добавленного к скопированному',
  clip_utc3: 'пояс UTC+3 из текста-ловушки',
  clip_utc3_time: 'время, пересчитанное из «UTC+3» (текст-ловушка)',
  injected_note: 'адрес из «инструкции для ИИ-анализатора» в журнале',
  xff_first: 'первый (подставленный) адрес X-Forwarded-For',
};

// Signals for any IB task (plan docs/ib-task9-grep-plan.md, part 2): trap answers and commands with the
// trap marker, answers without proof in the command output, wrong control questions (in the terminal or on
// the site), blocked pastes, autotyped command lines, hard grep tasks solved at once.
function taskSignals(progress, guard, siteDefense) {
  progress = progress || {};
  guard = guard || {};
  const traps = (progress.traps || []).length + (guard.trap || 0);
  const noProof = (progress.no_proof || []).length;
  const defense = progress.defense || {};
  const weakDefense = Object.keys(defense).filter((k) => (defense[k].results || []).some((r) => !r.ok));
  const siteWeak = !!(siteDefense && siteDefense.results.some((r) => !r.ok));
  const pastes = (guard.paste_blocked || 0) + (guard.drop_blocked || 0);
  const autotype = guard.autotype || 0;
  const fast = Object.entries(progress.grep || {}).filter(
    ([k, info]) => Number(k) >= 4 && info.solved_at && info.tries === 1 && info.seconds !== null && info.seconds < 45
  ).length;
  const flags = [];
  if (traps) flags.push(`ловушка ×${traps}`);
  if (noProof) flags.push(`ответ без доказательства ×${noProof}`);
  if (weakDefense.length) flags.push(`контр. вопросы: этап ${weakDefense.join(', ')}`);
  if (siteWeak) flags.push('контр. вопросы: неверно');
  if (pastes) flags.push(`вставка ×${pastes}`);
  if (autotype) flags.push(`набор без клавиш ×${autotype}`);
  if (fast) flags.push(`сразу верно за < 45 с ×${fast}`);
  const weight =
    1 + 4 * traps + 2 * noProof + 2 * weakDefense.length + (siteWeak ? 2 : 0) + Math.min(pastes, 10) / 2 + 2 * Math.min(autotype, 5) + fast;
  return { flags, weight, score: progress.score || null };
}

function attachSignals(key, rows, progressOf) {
  const guard = getIbGuardCounts(key);
  const site = getIbTaskDefenses(key);
  rows.forEach((r) => {
    r.signals = taskSignals(progressOf(r), guard.get(r.student.id), site.get(r.student.id));
  });
}

function logsSignals(progress, guard, det) {
  const res = taskSignals(progress, guard);
  if (det && det.defense_ok === 0) {
    res.flags.push('не объяснил вывод детектора');
    res.weight += 2;
  }
  return res;
}

// Weighted random pick for the oral check (more signals — more likely), among students who started.
function pickForOral(rows, n = 4, random = Math.random, started = (r) => r.task.passed > 0 || r.task.commands > 0) {
  const pool = rows.filter(started).map((r) => ({ r, w: r.signals ? r.signals.weight : 1 }));
  const picked = [];
  while (picked.length < n && pool.length) {
    let x = random() * pool.reduce((s, p) => s + p.w, 0);
    let i = 0;
    while (i < pool.length - 1 && x >= pool[i].w) {
      x -= pool[i].w;
      i += 1;
    }
    picked.push(pool.splice(i, 1)[0].r);
  }
  return picked;
}

// One student's №8: score, answers with proof and timing, traps, control questions, duty shifts,
// blocked pastes and the detector.
function logsDetail(task, studentId, log) {
  const progress = task.progress || {};
  const params = task.params || {};
  const opened = {};
  const completed = progress.completed_at || {};
  const firstCmd = log.length ? log[log.length - 1].created_at : null;
  for (let k = 1; k <= 8; k += 1) opened[k] = k === 1 ? firstCmd : completed[String(k - 1)] || null;
  const commandsBetween = (from, to) =>
    log.filter((l) => (!from || l.created_at >= from) && l.created_at <= to && !/^\s*(answer|task|check)\b/.test(l.line)).length;
  const answers = (progress.events || []).map((e) => {
    const stage = Number(String(e.qid).split('.')[0]) || null;
    const from = stage ? opened[stage] : null;
    const seconds = from ? Math.round((Date.parse(e.at) - Date.parse(from)) / 1000) : null;
    return {
      ...e,
      stage,
      seconds,
      commands: e.ok ? commandsBetween(from, e.at) : null,
      trapLabel: e.trap ? TRAP_LABELS[e.trap] || e.trap : null,
    };
  });
  const defense = Object.entries(progress.defense || {}).map(([k, d]) => ({ stage: Number(k), results: d.results || [], questions: d.qs || [] }));
  const duty = (progress.duty && progress.duty.shifts) || [];
  return {
    score: progress.score || null,
    answers,
    defense,
    duty,
    traps: (progress.traps || []).map((t) => ({ ...t, label: TRAP_LABELS[t.trap] || t.trap })),
    noProof: progress.no_proof || [],
    guard: getIbGuardCounts('logs').get(studentId) || {},
    guardEvents: getIbGuardEvents('logs', studentId, 50),
    detector: getLogsDetector(studentId),
    answersKey: {
      'SSH-атака': params.ssh_ip,
      'Учётная запись': params.target,
      'Веб-адрес (настоящий)': params.web_ip,
      'Подставленный в XFF': params.spoof_ip,
      'Подставленный в поддельные строки': params.framed_ip,
      'Адрес-ловушка (буфер)': params.clip_ip,
      'Вход по SSH': `${params.ssh_login_utc} UTC = ${params.ssh_login_local} +05`,
      'Выгружено': params.export_rows,
      'Удалено строк': params.deleted_lines,
      'Подправлена строка seq': params.tampered_seq,
    },
  };
}

const LAB_TASKS = IB_TASKS.filter((t) => t.lab);

// IB tasks №3–№9 in one list: per student (profile) and for the dashboard summary.
function ibTaskRows() {
  const rows = [];
  const push = (meta, list, total, href) =>
    list.forEach((t) =>
      rows.push({
        meta,
        studentId: t.student_id,
        solved: !!t.solved,
        solvedAt: t.solved_at || null,
        passed: t.solved && total === 1 ? 1 : t.passed || 0,
        total: total || t.total || 0,
        href: href(t.student_id),
      })
    );
  for (const meta of IB_TASKS) {
    if (meta.key === 'caesar') push(meta, getCaesarSecrets(), 1, () => '/admin/ib');
    else if (meta.key === 'configs') push(meta, getConfigTasks(), 0, () => '/admin/ib');
    else if (meta.key === 'terminal') push(meta, getTerminalTasks(), meta.stages.length, (id) => `/admin/ib/terminal/${encodeURIComponent(id)}`);
    else if (meta.lab) push(meta, getLabTasks(meta.key), meta.stages.length, (id) => `/admin/ib/lab/${meta.key}/${encodeURIComponent(id)}`);
  }
  return rows;
}

function ibProgressForStudent(studentId) {
  const rows = ibTaskRows().filter((r) => r.studentId === studentId);
  return { rows, solved: rows.filter((r) => r.solved).length };
}

function ibDashboard(now = Date.now()) {
  const rows = ibTaskRows();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const solved = rows.filter((r) => r.solved);
  return {
    solved: solved.length,
    today: solved.filter((r) => r.solvedAt && Date.parse(r.solvedAt) >= dayStart.getTime()).length,
    started: rows.length,
  };
}

// Tasks on the shared ib/server/lab_task.py engine (№6, №7), in course order.
function ibLabResults(ctx, filters) {
  return LAB_TASKS.map((meta) => {
    const res = stageTaskResults(ctx, filters, getLabTasks(meta.key), meta.stages, LAB_INFO[meta.key]);
    attachSignals(meta.key, res.rows, (r) => r.task.progress || {});
    if (meta.key === 'logs') {
      const guard = getIbGuardCounts('logs');
      const detectors = getLogsDetectors();
      res.rows.forEach((r) => {
        r.signals = logsSignals(r.task.progress || {}, guard.get(r.student.id), detectors.get(r.student.id));
      });
    }
    res.scored = res.rows.some((r) => r.signals.score);
    if (filters.pick === meta.key) res.picked = pickForOral(res.rows);
    return { meta, ...res };
  });
}

function ibLabDetail(ctx, key, studentId) {
  const lab = LAB_TASKS.find((t) => t.key === key);
  const student = ctx.students.find((s) => s.id === studentId);
  const task = lab && getLabTasks(key).find((t) => t.student_id === studentId);
  if (!student || !task) return null;
  const meta = {
    number: lab.number,
    title: lab.title,
    total: lab.stages.length,
    info: LAB_INFO[key] ? LAB_INFO[key](task.params) : null,
    checkCommand: `python3 ib/checks/lab_check.py --task ${key} ${studentId} --text`,
  };
  const log = getLabLog(key, studentId);
  const detail = stageTaskDetail(student, task, lab.stages, log, meta);
  if (key === 'logs') detail.logs = logsDetail(task, studentId, getLabLog(key, studentId, 5000));
  if (key === 'grep') detail.grep = grepDetail(task);
  detail.integrity = integrityDetail(key, studentId, task.progress || {});
  detail.score = (task.progress || {}).score || null;
  return detail;
}

module.exports = {
  STATUS_META,
  trainerMistakes,
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
  ibResults,
  ibConfigResults,
  ibTerminalResults,
  ibTerminalDetail,
  ibLabResults,
  ibLabDetail,
  pickForOral,
  search,
  nextInQueue,
};
