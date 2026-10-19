// Data for the student home page ("/") and the per-subject pages ("/subjects/:key").
// Subjects: the SQL trainer (theory + practice per topic) and Python / JavaScript (the shared
// file-submission assignments, grouped by SUMMARY.md sections, plus each language's task bank).
const fs = require('fs');
const path = require('path');
const { parseSummary } = require('./summary-parser');
const { getTopicsForUser, groupBySection } = require('./sql-topics');
const { withProgress, topicProgress } = require('./sql-progress');
const { hasFullAccess } = require('./test-access');
const { LANGUAGE_SUBJECTS, COURSE_SUBJECTS } = require('./subjects');
const { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, ibSummary } = require('./ib-tasks');
const pybasics = require('./python-basics');
const {
  getAssignmentsForStudent,
  getLanguageExercises,
  getSubmissions,
  getSqlExercises,
  getSolvedSqlExerciseIds,
} = require('../db');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');
const SQL_SUBJECT_KEY = 'sql';
const SQL_SUBJECT_TITLE = 'Базы данных (SQL)';
const UPCOMING_LIMIT = 6;

function isPastDue(dueDate, now) {
  return now > new Date(dueDate).getTime();
}

// Nearest deadline first; same deadline keeps the SUMMARY.md order, so "Задача 2" comes
// before "Задача 10" and the theory page before the tasks.
function byDueThenCreated(a, b) {
  return a.dueDate.localeCompare(b.dueDate) || a.summaryIndex - b.summaryIndex || a.id.localeCompare(b.id);
}

function readSummaryTree() {
  return parseSummary(fs.readFileSync(SUMMARY_PATH, 'utf-8'));
}

function summaryPositions(tree) {
  const positions = new Map();
  (function walk(nodes) {
    for (const node of nodes) {
      if (node.path && !positions.has(node.path)) positions.set(node.path, positions.size);
      walk(node.children);
    }
  })(tree);
  return positions;
}

// Same deadline rule as canSubmit in src/routes/student.js.
function withStatus(assignments, submissions, now) {
  return assignments.map((a) => {
    const related = submissions.filter((s) => s.assignmentId === a.id);
    const latest = related[related.length - 1];
    const status = latest ? latest.status : 'not_submitted';
    const hoursLeft = (new Date(a.dueDate).getTime() - now) / (1000 * 60 * 60);
    const overdue =
      (status === 'not_submitted' || (status === 'not_done' && !latest.resubmitAllowed)) && isPastDue(a.dueDate, now);
    return { ...a, status, overdue, dueSoon: hoursLeft > 0 && hoursLeft < 24 };
  });
}

// subject: undefined — all assignments; null — the shared Python/JavaScript ones; a COURSE_SUBJECTS key.
function studentAssignments(user, now, tree = readSummaryTree(), subject) {
  const submissions = getSubmissions().filter((s) => s.studentId === user.id);
  const positions = summaryPositions(tree);
  const visible = getAssignmentsForStudent(user.id, user.group).filter(
    (a) => subject === undefined || (a.subject || null) === subject
  );
  return withStatus(visible, submissions, now).map((a) => ({
    ...a,
    summaryIndex: positions.has(a.mdPath) ? positions.get(a.mdPath) : Number.MAX_SAFE_INTEGER,
  }));
}

function countByStatus(list) {
  return {
    total: list.length,
    done: list.filter((a) => a.status === 'done').length,
    pending: list.filter((a) => a.status === 'pending').length,
    todo: list.filter((a) => (a.status === 'not_submitted' || a.status === 'not_done') && !a.overdue).length,
    overdue: list.filter((a) => a.overdue).length,
  };
}

function sqlSummary(user) {
  const exercises = withProgress(getSqlExercises(), getSolvedSqlExerciseIds(user.id), hasFullAccess(user));
  const topics = topicProgress(getTopicsForUser(user), exercises);
  const practiceTopics = topics.filter((t) => t.total > 0);
  const next = exercises.find((e) => e.unlocked && !e.solved) || null;
  return {
    exercises,
    topics,
    sections: groupBySection(topics),
    total: exercises.length,
    solved: exercises.filter((e) => e.solved).length,
    topicsCount: topics.length,
    practiceTopicsCount: practiceTopics.length,
    next,
    currentTopic: next ? topics.find((t) => t.key === next.topic) : null,
  };
}

// Bank tasks of one language grouped by topic, in bank order.
function languageBank(language) {
  const topics = [];
  for (const ex of getLanguageExercises(language)) {
    let topic = topics.find((t) => t.key === ex.topic);
    if (!topic) {
      topic = { key: ex.topic, label: ex.topicLabel, items: [] };
      topics.push(topic);
    }
    topic.items.push(ex);
  }
  return topics;
}

function buildStudentHome(user, now = Date.now()) {
  const assignments = studentAssignments(user, now);
  const counts = countByStatus(assignments);
  const open = assignments.filter((a) => a.status !== 'done' && !a.overdue).sort(byDueThenCreated);

  const shared = assignments.filter((a) => !a.subject);
  const sharedOpen = open.filter((a) => !a.subject);
  const languageSubjects = Object.entries(LANGUAGE_SUBJECTS).map(([key, title]) => ({
    key,
    kind: 'language',
    title,
    bankCount: getLanguageExercises(key).length,
    counts: countByStatus(shared),
    nextDue: sharedOpen.length ? sharedOpen[0].dueDate : null,
  }));

  // Shown only once the student has an assignment in it.
  const courseSubjects = Object.values(COURSE_SUBJECTS)
    .map((c) => {
      const items = assignments.filter((a) => a.subject === c.key);
      const next = open.find((a) => a.subject === c.key);
      return {
        key: c.key,
        kind: 'course',
        title: c.title,
        icon: c.icon,
        kindLabel: c.kind,
        theoryCount: c.theory.length,
        counts: countByStatus(items),
        nextDue: next ? next.dueDate : null,
      };
    })
    .filter((c) => c.counts.total > 0);

  const sql = sqlSummary(user);
  const sqlSubject = {
    key: SQL_SUBJECT_KEY,
    kind: 'sql',
    title: SQL_SUBJECT_TITLE,
    solved: sql.solved,
    total: sql.total,
    topicsCount: sql.topicsCount,
    currentTopic: sql.currentTopic,
  };

  // Shown only once the student has a task there (tasks are generated per group by the teacher).
  const ib = ibSummary(user);
  const ibSubjects = ib.total
    ? [{ key: IB_SUBJECT_KEY, kind: 'ib', title: IB_SUBJECT_TITLE, solved: ib.solved, total: ib.total, next: ib.next }]
    : [];

  // Only for the groups it's opened to (src/lib/python-basics.js PYBASICS_GROUPS) and TEST.
  const pybasicsSubjects = [];
  if (pybasics.canSeePythonBasics(user)) {
    const pb = pybasics.summaryForStudent(user);
    pybasicsSubjects.push({
      key: pybasics.PYBASICS_KEY,
      kind: 'pybasics',
      title: pybasics.PYBASICS_TITLE,
      icon: pybasics.PYBASICS_ICON,
      topic: pybasics.PYBASICS_TOPIC,
      solved: pb.solved,
      total: pb.total,
      next: pb.next,
    });
  }

  return {
    subjects: [sqlSubject, ...pybasicsSubjects, ...languageSubjects, ...ibSubjects, ...courseSubjects],
    counts,
    // Anything the student still has to act on (or is waiting on), nearest deadline first.
    upcoming: open.slice(0, UPCOMING_LIMIT),
    upcomingMore: Math.max(0, open.length - UPCOMING_LIMIT),
  };
}

// File-submission assignments grouped by the SUMMARY.md section they live in, in SUMMARY
// order; assignments outside any section (e.g. individual ones) go last. Shared by the
// Python and JavaScript subjects — the same tasks are solved in either language.
function buildAssignmentSections(user, now = Date.now(), subject = null) {
  const tree = readSummaryTree();
  const list = studentAssignments(user, now, tree, subject);

  const placed = new Set();
  const sections = [];

  function collect(nodes, into) {
    for (const node of nodes) {
      const assignment = node.path && list.find((a) => a.mdPath === node.path && !placed.has(a.id));
      if (assignment) {
        placed.add(assignment.id);
        into.push(assignment);
      }
      collect(node.children, into);
    }
  }

  for (const node of tree) {
    const items = [];
    collect([node], items);
    if (items.length) sections.push({ title: node.path ? 'Задания' : node.title, items });
  }

  const rest = list.filter((a) => !placed.has(a.id)).sort(byDueThenCreated);
  const personal = rest.filter((a) => a.targetType === 'individual');
  const other = rest.filter((a) => a.targetType !== 'individual');
  if (personal.length) sections.push({ title: 'Персональные задания', items: personal });
  if (other.length) sections.push({ title: 'Другие задания', items: other });

  return { sections, counts: countByStatus(list) };
}

function buildLanguageSubject(user, language, now = Date.now()) {
  if (!LANGUAGE_SUBJECTS[language]) return null;
  return {
    key: language,
    title: LANGUAGE_SUBJECTS[language],
    ...buildAssignmentSections(user, now),
    bank: languageBank(language),
  };
}

// A course subject page: theory pages and its own assignments (null if unknown or nothing assigned).
function buildCourseSubject(user, key, now = Date.now()) {
  const course = COURSE_SUBJECTS[key];
  if (!course) return null;
  const sections = buildAssignmentSections(user, now, key);
  if (!sections.counts.total) return null;
  return { ...course, ...sections };
}

module.exports = {
  buildStudentHome,
  buildLanguageSubject,
  buildCourseSubject,
  languageBank,
  sqlSummary,
  SQL_SUBJECT_KEY,
  SQL_SUBJECT_TITLE,
};
