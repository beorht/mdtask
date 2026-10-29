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
const exam = require('./exam');
const { getExamVariant } = require('../db');
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
  // У Python и JavaScript для тех, кому открыт курс предмета (src/lib/python-course, src/lib/js-course), карточка
  // показывает курс.
  const languageSubjects = Object.entries(LANGUAGE_SUBJECTS).map(([key, title]) => {
    const keep = languageFilter(key);
    const mine = shared.filter(keep);
    const mineOpen = sharedOpen.filter(keep);
    const card = {
      key,
      kind: 'language',
      title,
      bankCount: getLanguageExercises(key).length,
      counts: countByStatus(mine),
      nextDue: mineOpen.length ? mineOpen[0].dueDate : null,
    };
    const lc = languageCourse(key);
    if (lc && lc.canSeeCourse(user)) {
      const pc = lc.summaryForStudent(user);
      card.kind = 'python-course';
      card.courseTitle = lc.COURSE_TITLE;
      card.solved = pc.solved;
      card.total = pc.total;
      card.lessonsCount = pc.lessons.length;
      card.current = pc.current && { number: pc.current.number, title: pc.current.title };
    }
    return card;
  });

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

  // «Emmet · Тетрадь» — всем студентам (src/lib/emmet).
  const emmet = require('./emmet');
  const emmetSubjects = [];
  if (emmet.canSeeEmmet(user)) {
    const em = emmet.summaryForStudent(user);
    emmetSubjects.push({ key: emmet.EMMET_KEY, kind: 'emmet', title: emmet.EMMET_TITLE, icon: '✍️', solved: em.solved, total: em.total });
  }

  // «Web-разработка: HTML» — группы из HTML_GROUPS и TEST (src/lib/html-course).
  const htmlCourse = require('./html-course');
  const htmlSubjects = [];
  if (htmlCourse.canSeeHtml(user)) {
    const hc = htmlCourse.summaryForStudent(user);
    htmlSubjects.push({
      key: htmlCourse.HTML_KEY,
      kind: 'html',
      title: htmlCourse.HTML_TITLE,
      icon: htmlCourse.HTML_ICON,
      solved: hc.solved,
      total: hc.total,
      topicsCount: hc.topics.length,
      current: hc.current && { number: hc.current.number, title: hc.current.title },
    });
  }

  // «Web-разработка: CSS» — группы из CSS_GROUPS и TEST (src/lib/css-course).
  const cssCourse = require('./css-course');
  if (cssCourse.canSeeCss(user)) {
    const cc = cssCourse.summaryForStudent(user);
    htmlSubjects.push({
      key: cssCourse.CSS_KEY,
      kind: 'html',
      title: cssCourse.CSS_TITLE,
      icon: cssCourse.CSS_ICON,
      solved: cc.solved,
      total: cc.total,
      topicsCount: cc.topics.length,
      current: cc.current && { number: cc.current.number, title: cc.current.title },
    });
  }

  // The final exam: a card while it runs and after it; the IB tasks and the trainer are closed while it runs.
  const webExam = require('./web-exam');
  const exams = [...Object.values(exam.EXAMS).map((def) => [def, exam]), ...Object.values(webExam.EXAMS).map((def) => [def, webExam])]
    .map(([def, lib]) => {
      if (!getExamVariant(def.id, user.id)) return null;
      const win = lib.examWindow(def);
      const phase = lib.phaseFor(def, user, win);
      return phase === 'before' ? null : { id: def.id, title: def.title, subtitle: def.subtitle, phase, endsAt: win.endsAt, published: !!win.publishedAt };
    })
    .filter(Boolean);
  const lock = exam.examLockFor(user);
  const { subjectAllowed } = require('./test-access');
  const subjects = [sqlSubject, ...emmetSubjects, ...htmlSubjects, ...languageSubjects, ...ibSubjects, ...courseSubjects]
    .filter((s) => subjectAllowed(user, s.key));
  if (lock) subjects.forEach((s) => (s.examLocked = true));

  return {
    exams,
    subjects,
    counts,
    lockLabel: lock && (lock.during ? 'Закрыто на время контрольной' : 'Закрыто преподавателем'),
    // Anything the student still has to act on (or is waiting on), nearest deadline first; nothing while closed.
    upcoming: lock ? [] : open.slice(0, UPCOMING_LIMIT),
    upcomingMore: lock ? 0 : Math.max(0, open.length - UPCOMING_LIMIT),
  };
}

// File-submission assignments grouped by the SUMMARY.md section they live in, in SUMMARY
// order; assignments outside any section (e.g. individual ones) go last. Shared by the
// Python and JavaScript subjects — the same tasks are solved in either language.
// keep(a) — дополнительный отбор заданий (у Python — только задания по Python, src/lib/python-course).
function buildAssignmentSections(user, now = Date.now(), subject = null, keep = () => true) {
  const tree = readSummaryTree();
  const list = studentAssignments(user, now, tree, subject).filter(keep);

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

// В Python — только задания по Python (content/python-course/assignments.json), остальные (DOM и т. п.) — в JavaScript.
const languageFilter = (language) => {
  if (language !== 'python') return () => true;
  const { lessonForAssignment } = require('./python-course');
  return (a) => lessonForAssignment(a.mdPath) !== null;
};

function buildLanguageSubject(user, language, now = Date.now()) {
  if (!LANGUAGE_SUBJECTS[language]) return null;
  return {
    key: language,
    title: LANGUAGE_SUBJECTS[language],
    ...buildAssignmentSections(user, now, null, languageFilter(language)),
    bank: languageBank(language),
  };
}

// Курсы предметов-языков: Python — «Начальный Python», JavaScript — «JavaScript: от синтаксиса до DOM».
const languageCourse = (language) => ({ python: require('./python-course'), javascript: require('./js-course') })[language] || null;

/** Задания со сдачей предмета, разложенные по урокам его курса: { ключ урока: [задание со статусом] }. */
function pythonAssignmentsByLesson(user, now = Date.now(), language = 'python') {
  const { lessonForAssignment, replacedByCourse } = languageCourse(language);
  const byLesson = {};
  for (const a of studentAssignments(user, now, readSummaryTree(), null).sort((x, y) => x.summaryIndex - y.summaryIndex)) {
    const lesson = replacedByCourse(a.mdPath) ? null : lessonForAssignment(a.mdPath);
    if (lesson) (byLesson[lesson] = byLesson[lesson] || []).push(a);
  }
  return byLesson;
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
  pythonAssignmentsByLesson,
  buildCourseSubject,
  languageBank,
  sqlSummary,
  SQL_SUBJECT_KEY,
  SQL_SUBJECT_TITLE,
};
