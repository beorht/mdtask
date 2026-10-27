const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const {
  getAssignments,
  getLanguageExercises,
  getSubmissions,
  getLatestSubmission,
  createSubmission,
  updateSubmissionFiles,
  getCodeDraft,
  saveCodeDraft,
} = require('../db');
const { parseCodeFiles, storeCodeSubmission, initialCode } = require('../lib/code-submission');
const { renderMarkdown, extractHeadings } = require('../lib/markdown');
const { UPLOAD_DIR } = require('../lib/submission-files');
const { hasFullAccess, seesSharedAssignments } = require('../lib/test-access');
const { blockDuringExam } = require('../middleware/exam-lock');
const { LANGUAGE_SUBJECTS, COURSE_SUBJECTS, uploadTypesOf } = require('../lib/subjects');
const {
  buildStudentHome,
  buildLanguageSubject,
  pythonAssignmentsByLesson,
  buildCourseSubject,
  sqlSummary,
  SQL_SUBJECT_KEY,
  SQL_SUBJECT_TITLE,
} = require('../lib/student-home');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const router = express.Router();

// The group's practical work closed for the final exam or by the teacher (src/lib/exam
// examLockFor): subject pages, theory, assignments and uploads show why / answer 423.
router.use(['/subjects', '/assignment'], (req, res, next) =>
  req.session.user && require('../lib/exam').examLockFor(req.session.user) ? blockDuringExam(req, res, next) : next(),
);

const upload = multer({
  // Browsers send file names as UTF-8; busboy's default (latin1) turned «Задача 1.zip» into mojibake.
  defParamCharset: 'utf8',
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_DIR, req.params.id, req.session.user.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const safeName = path.basename(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
    },
  }),
  // Allowed extensions are per assignment (assignments.upload_types, default .zip/.rar).
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const assignment = getAssignments().find((a) => a.id === req.params.id);
    const ok = uploadTypesOf(assignment).includes(ext);
    if (!ok) (req.rejectedFiles = req.rejectedFiles || []).push(file.originalname);
    cb(null, ok);
  },
});

function handleUpload(req, res, next) {
  upload.array('files')(req, res, (err) => {
    if (err) return res.status(400).send('Ошибка загрузки файла.');
    next();
  });
}

function canAccessAssignment(assignment, user) {
  if (assignment.targetType === 'individual') return assignment.targetStudentId === user.id;
  if (hasFullAccess(user)) return true;
  return assignment.targetGroup ? assignment.targetGroup === user.group : seesSharedAssignments(user.group);
}

function canSubmit(assignment, latestSubmission) {
  if (!latestSubmission) return Date.now() <= new Date(assignment.dueDate).getTime();
  if (latestSubmission.status === 'done') return false;
  if (latestSubmission.status === 'pending') return true;
  if (latestSubmission.resubmitAllowed) return true;
  return Date.now() <= new Date(assignment.dueDate).getTime();
}

// "/" is the home link everywhere (error pages, brand); a teacher's home is the admin panel.
function teacherHomeToAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'teacher') return res.redirect('/admin');
  next();
}

// Home: a standalone landing page (no sidebar) with one card per subject.
router.get('/', teacherHomeToAdmin, requireRole('student'), (req, res) => {
  const user = req.session.user;
  res.render('student-home', { user, home: buildStudentHome(user), activeAssignmentId: null });
});

function subjectSidebar(user, subject) {
  return buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group, subject });
}

// Python and JavaScript share the assignments, so an assignment page shows the navigation of
// the language the student came from (?subject=…), else the one they last opened.
function currentLanguage(req) {
  const fromQuery = req.query.subject;
  if (LANGUAGE_SUBJECTS[fromQuery]) req.session.lastSubject = fromQuery;
  return LANGUAGE_SUBJECTS[req.session.lastSubject] ? req.session.lastSubject : 'python';
}

// One page per subject, each with its own navigation.
router.get('/subjects/:key', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const key = req.params.key;
  const common = { user, sidebarTree: subjectSidebar(user, key), activeAssignmentId: null, activePath: `/subjects/${key}` };

  if (key === SQL_SUBJECT_KEY) {
    return res.render('subject-sql', { ...common, title: SQL_SUBJECT_TITLE, sql: sqlSummary(user) });
  }

  if (COURSE_SUBJECTS[key]) {
    const course = buildCourseSubject(user, key);
    if (!course) return res.status(404).render('404');
    return res.render('subject-course', { ...common, subject: course });
  }

  const subject = buildLanguageSubject(user, key);
  if (!subject) return res.status(404).render('404');
  req.session.lastSubject = key;
  // Курс «Начальный Python» (src/lib/python-course) — блок вверху страницы Python, пока только TEST.
  const pythonCourse = require('../lib/python-course');
  const course = key === 'python' && pythonCourse.canSeeCourse(user)
    ? { ...pythonCourse.summaryForStudent(user), base: pythonCourse.COURSE_BASE, title: pythonCourse.COURSE_TITLE, assignments: pythonAssignmentsByLesson(user) }
    : null;
  res.render('subject-language', { ...common, subject, course });
});

// Theory page of a course subject (visible once the student has an assignment in it).
router.get('/subjects/:key/theory/:slug', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const key = req.params.key;
  const course = buildCourseSubject(user, key);
  const page = course && course.theory.find((th) => th.slug === req.params.slug);
  if (!page) return res.status(404).render('404');
  const md = fs.readFileSync(page.file, 'utf-8');
  const index = course.theory.indexOf(page);
  res.render('course-theory', {
    user,
    sidebarTree: subjectSidebar(user, key),
    activeAssignmentId: null,
    activePath: `/subjects/${key}/theory/${page.slug}`,
    subject: course,
    page,
    next: course.theory[index + 1] || null,
    html: renderMarkdown(md),
    toc: extractHeadings(md).filter((h) => h.level === 2),
  });
});

// A task from the language bank: read-only practice material, nothing to submit.
router.get('/subjects/:key/bank/:id', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const key = req.params.key;
  if (!LANGUAGE_SUBJECTS[key]) return res.status(404).render('404');

  const exercises = getLanguageExercises(key);
  const index = exercises.findIndex((e) => e.id === req.params.id);
  if (index === -1) return res.status(404).render('404');
  req.session.lastSubject = key;

  const exercise = exercises[index];
  res.render('bank-exercise', {
    user,
    sidebarTree: subjectSidebar(user, key),
    activeAssignmentId: null,
    activePath: `/subjects/${key}/bank/${exercise.id}`,
    subjectKey: key,
    subjectTitle: LANGUAGE_SUBJECTS[key],
    exercise,
    html: renderMarkdown(exercise.descriptionMd),
    prev: exercises[index - 1] || null,
    next: exercises[index + 1] || null,
    position: index + 1,
    total: exercises.length,
  });
});

router.get('/assignment/:id', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const assignment = getAssignments().find((a) => a.id === req.params.id);

  if (!assignment) return res.status(404).render('404');
  if (!canAccessAssignment(assignment, user)) {
    return res.status(404).render('404');
  }

  const mdText = fs.readFileSync(path.join(CONTENT_DIR, assignment.mdPath), 'utf-8');
  const html = renderMarkdown(mdText);
  const toc = extractHeadings(mdText);

  const submissions = getSubmissions()
    .filter((s) => s.assignmentId === assignment.id && s.studentId === user.id)
    .sort((a, b) => (a.parentSubmissionId ? 1 : -1));

  // A course-subject assignment lives in that subject; the shared ones in Python/JavaScript.
  const course = COURSE_SUBJECTS[assignment.subject];
  const language = course ? null : currentLanguage(req);
  const latest = getLatestSubmission(assignment.id, user.id);
  const draft = assignment.codeFiles ? getCodeDraft(assignment.id, user.id) : null;

  res.render('assignment-view', {
    user,
    sidebarTree: subjectSidebar(user, course ? course.key : language),
    assignment,
    html,
    toc,
    submissions,
    canSubmit: canSubmit(assignment, latest),
    subject: course ? { key: course.key, title: course.title } : { key: language, title: LANGUAGE_SUBJECTS[language] },
    uploadTypes: uploadTypesOf(assignment),
    uploadError: req.query.upload === 'bad',
    activeAssignmentId: assignment.id,
    code: assignment.codeFiles
      ? { files: initialCode(assignment, draft), savedAt: draft ? draft.updatedAt : null }
      : null,
  });
});

router.post('/assignment/:id/submit', requireRole('student'), handleUpload, (req, res) => {
  const user = req.session.user;
  const assignment = getAssignments().find((a) => a.id === req.params.id);

  if (!assignment) return res.status(404).render('404');
  if (!canAccessAssignment(assignment, user)) {
    return res.status(404).render('404');
  }

  if (assignment.codeFiles) return res.status(400).send('Это задание сдаётся через редактор кода на странице задания.');

  const latest = getLatestSubmission(assignment.id, user.id);
  if (!canSubmit(assignment, latest)) {
    return res.status(403).render('403');
  }

  const files = (req.files || []).map((f) => f.originalname);
  const storedFiles = (req.files || []).map((f) => f.filename);
  if (files.length > 0) {
    if (!latest || latest.status === 'not_done') {
      createSubmission({
        assignmentId: assignment.id,
        studentId: user.id,
        files,
        storedFiles,
        parentSubmissionId: latest ? latest.id : null,
      });
    } else {
      updateSubmissionFiles(latest.id, files, storedFiles);
    }
  }

  if (!files.length && req.rejectedFiles && req.rejectedFiles.length) {
    return res.redirect(`/assignment/${assignment.id}?upload=bad`);
  }
  res.redirect(`/assignment/${assignment.id}`);
});

// Editor assignments: the student's own assignment that is written in the on-site editor.
function findCodeAssignment(req) {
  const assignment = getAssignments().find((a) => a.id === req.params.id);
  if (!assignment || !assignment.codeFiles || !canAccessAssignment(assignment, req.session.user)) return null;
  return assignment;
}

// Autosave from the editor. Drafts are kept even after the deadline — they change nothing
// the teacher sees.
router.post('/assignment/:id/code/draft', requireRole('student'), (req, res) => {
  const assignment = findCodeAssignment(req);
  if (!assignment) return res.status(404).json({ error: 'Задание не найдено.' });
  const { files, error } = parseCodeFiles(assignment, req.body);
  if (error) return res.status(400).json({ error });
  res.json({ savedAt: saveCodeDraft(assignment.id, req.session.user.id, files) });
});

// Submit: the editor files become solution.zip — a new submission, or a replacement of
// the files of one still waiting for review (same rules as an archive upload).
router.post('/assignment/:id/code/submit', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const assignment = findCodeAssignment(req);
  if (!assignment) return res.status(404).json({ error: 'Задание не найдено.' });

  const latest = getLatestSubmission(assignment.id, user.id);
  if (!canSubmit(assignment, latest)) return res.status(403).json({ error: 'Приём решений по этому заданию закрыт.' });

  const { files, error } = parseCodeFiles(assignment, req.body);
  if (error) return res.status(400).json({ error });
  const empty = assignment.codeFiles.filter((name) => !files[name].replace(/^#[^\n]*$/gm, '').trim());
  if (empty.length) return res.status(400).json({ error: `Файл ${empty.join(', ')} пустой — допишите код перед сдачей.` });

  saveCodeDraft(assignment.id, user.id, files);
  const stored = storeCodeSubmission(assignment, user.id, files);
  if (!latest || latest.status === 'not_done') {
    createSubmission({ assignmentId: assignment.id, studentId: user.id, ...stored, parentSubmissionId: latest ? latest.id : null });
  } else {
    updateSubmissionFiles(latest.id, stored.files, stored.storedFiles);
  }
  res.json({ ok: true });
});

module.exports = router;
