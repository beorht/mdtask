const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const {
  getCourses,
  getAssignments,
  getSubmissions,
  getLatestSubmission,
  createSubmission,
  updateSubmissionFiles,
} = require('../db');
const { renderMarkdown, extractHeadings } = require('../lib/markdown');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
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

function canSubmit(assignment, latestSubmission) {
  if (!latestSubmission) return Date.now() <= new Date(assignment.dueDate).getTime();
  if (latestSubmission.status === 'done') return false;
  if (latestSubmission.status === 'pending') return true;
  return Date.now() <= new Date(assignment.dueDate).getTime();
}

router.get('/', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const sidebarTree = buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group });
  const courses = getCourses();
  const submissions = getSubmissions().filter((s) => s.studentId === user.id);

  const assignments = getAssignments()
    .filter((a) => a.targetType === 'group' || a.targetStudentId === user.id)
    .map((a) => {
      const related = submissions.filter((s) => s.assignmentId === a.id);
      const status = related.length ? related[related.length - 1].status : 'not_submitted';
      const hoursLeft = (new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      const dueSoon = hoursLeft > 0 && hoursLeft < 24;
      return { ...a, status, dueSoon };
    });

  res.render('student-dashboard', { user, sidebarTree, courses, assignments, activeAssignmentId: null });
});

router.get('/assignment/:id', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const assignment = getAssignments().find((a) => a.id === req.params.id);

  if (!assignment) return res.status(404).render('404');
  if (assignment.targetType === 'individual' && assignment.targetStudentId !== user.id) {
    return res.status(404).render('404');
  }

  const mdText = fs.readFileSync(path.join(CONTENT_DIR, assignment.mdPath), 'utf-8');
  const html = renderMarkdown(mdText);
  const toc = extractHeadings(mdText);

  const submissions = getSubmissions()
    .filter((s) => s.assignmentId === assignment.id && s.studentId === user.id)
    .sort((a, b) => (a.parentSubmissionId ? 1 : -1));

  const sidebarTree = buildSidebarTree({ role: 'student', studentId: user.id, studentGroup: user.group });
  const latest = getLatestSubmission(assignment.id, user.id);

  res.render('assignment-view', {
    user,
    sidebarTree,
    assignment,
    html,
    toc,
    submissions,
    canSubmit: canSubmit(assignment, latest),
    activeAssignmentId: assignment.id,
  });
});

router.post('/assignment/:id/submit', requireRole('student'), handleUpload, (req, res) => {
  const user = req.session.user;
  const assignment = getAssignments().find((a) => a.id === req.params.id);

  if (!assignment) return res.status(404).render('404');
  if (assignment.targetType === 'individual' && assignment.targetStudentId !== user.id) {
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
