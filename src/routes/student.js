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
} = require('../db');
const { renderMarkdown, extractHeadings } = require('../lib/markdown');
const { UPLOAD_DIR } = require('../lib/submission-files');
const { hasFullAccess } = require('../lib/test-access');
const { LANGUAGE_SUBJECTS } = require('../lib/subjects');
const {
  buildStudentHome,
  buildLanguageSubject,
  sqlSummary,
  SQL_SUBJECT_KEY,
  SQL_SUBJECT_TITLE,
} = require('../lib/student-home');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const ALLOWED_EXTENSIONS = ['.zip', '.rar'];

const router = express.Router();

const upload = multer({
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
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ALLOWED_EXTENSIONS.includes(ext));
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
  return !assignment.targetGroup || assignment.targetGroup === user.group || hasFullAccess(user);
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

  const subject = buildLanguageSubject(user, key);
  if (!subject) return res.status(404).render('404');
  req.session.lastSubject = key;
  res.render('subject-language', { ...common, subject });
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

  const language = currentLanguage(req);
  const latest = getLatestSubmission(assignment.id, user.id);

  res.render('assignment-view', {
    user,
    sidebarTree: subjectSidebar(user, language),
    assignment,
    html,
    toc,
    submissions,
    canSubmit: canSubmit(assignment, latest),
    subject: { key: language, title: LANGUAGE_SUBJECTS[language] },
    activeAssignmentId: assignment.id,
  });
});

router.post('/assignment/:id/submit', requireRole('student'), handleUpload, (req, res) => {
  const user = req.session.user;
  const assignment = getAssignments().find((a) => a.id === req.params.id);

  if (!assignment) return res.status(404).render('404');
  if (!canAccessAssignment(assignment, user)) {
    return res.status(404).render('404');
  }

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

  res.redirect(`/assignment/${assignment.id}`);
});

module.exports = router;
