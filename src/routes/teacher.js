const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const {
  getCourses,
  getAssignments,
  getUsers,
  getSubmissions,
  updateSubmissionStatus,
  reopenSubmission,
  createAssignment,
} = require('../db');
const { renderMarkdown, slugify } = require('../lib/markdown');
const { addEntryToSummary, listGroupSections, INDIVIDUAL_SECTION_TITLE } = require('../lib/summary-writer');

const router = express.Router();

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

function resolveSectionDir(sectionTitle, sections) {
  const existing = sections.find((s) => s.title === sectionTitle);
  return existing ? existing.dir : `section-${slugify(sectionTitle)}`;
}

function uniqueMdPath(dir, slug) {
  let filename = `${slug}.md`;
  let counter = 2;
  while (fs.existsSync(path.join(CONTENT_DIR, dir, filename))) {
    filename = `${slug}-${counter}.md`;
    counter += 1;
  }
  return `${dir}/${filename}`;
}

router.get('/teacher', requireRole('teacher'), (req, res) => {
  const user = req.session.user;
  const courses = getCourses().filter((c) => c.teacherId === user.id);
  const assignments = getAssignments();
  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('teacher-dashboard', { user, sidebarTree, courses, assignments, activeAssignmentId: null });
});

router.get('/teacher/courses/:courseId/assignments/new', requireRole('teacher'), (req, res) => {
  const course = getCourses().find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).render('404');

  const summaryText = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const sections = listGroupSections(summaryText);
  const students = getUsers().filter((u) => u.role === 'student');
  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('assignment-new', {
    user: req.session.user,
    sidebarTree,
    course,
    sections,
    students,
    error: null,
    activeAssignmentId: null,
  });
});

router.post('/teacher/courses/:courseId/assignments', requireRole('teacher'), (req, res) => {
  const course = getCourses().find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).render('404');

  const title = (req.body.title || '').trim();
  const dueDate = req.body.dueDate;
  const targetType = req.body.targetType === 'individual' ? 'individual' : 'group';
  const sectionTitle = (req.body.sectionTitle || '').trim();
  const targetStudentId = req.body.targetStudentId;

  const missingRequired =
    !title || !dueDate || (targetType === 'group' && !sectionTitle) || (targetType === 'individual' && !targetStudentId);

  if (missingRequired) {
    const summaryText = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    return res.status(400).render('assignment-new', {
      user: req.session.user,
      sidebarTree: buildSidebarTree({ role: 'teacher' }),
      course,
      sections: listGroupSections(summaryText),
      students: getUsers().filter((u) => u.role === 'student'),
      error: 'Заполните все обязательные поля.',
      activeAssignmentId: null,
    });
  }

  const summaryText = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const sections = listGroupSections(summaryText);

  const dir = targetType === 'individual' ? `individual/${targetStudentId}` : resolveSectionDir(sectionTitle, sections);
  const effectiveSectionTitle = targetType === 'individual' ? INDIVIDUAL_SECTION_TITLE : sectionTitle;

  const mdPath = uniqueMdPath(dir, slugify(title));
  const fullPath = path.join(CONTENT_DIR, mdPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `# ${title}\n\nОписание задания.\n`, 'utf-8');

  fs.writeFileSync(SUMMARY_PATH, addEntryToSummary(summaryText, { sectionTitle: effectiveSectionTitle, title, mdPath }), 'utf-8');

  const assignment = createAssignment({
    courseId: course.id,
    title,
    mdPath,
    targetType,
    targetStudentId: targetType === 'individual' ? targetStudentId : null,
    dueDate,
  });

  res.redirect(`/teacher/assignment/${assignment.id}/edit`);
});

router.get('/teacher/assignment/:id/edit', requireRole('teacher'), (req, res) => {
  const assignment = getAssignments().find((a) => a.id === req.params.id);
  if (!assignment) return res.status(404).render('404');

  const markdown = fs.readFileSync(path.join(CONTENT_DIR, assignment.mdPath), 'utf-8');
  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('assignment-editor', {
    user: req.session.user,
    sidebarTree,
    assignment,
    markdown,
    saved: req.query.saved === '1',
    activeAssignmentId: assignment.id,
  });
});

router.post('/teacher/assignment/:id/save', requireRole('teacher'), (req, res) => {
  const assignment = getAssignments().find((a) => a.id === req.params.id);
  if (!assignment) return res.status(404).render('404');

  const markdown = typeof req.body.markdown === 'string' ? req.body.markdown : '';
  fs.writeFileSync(path.join(CONTENT_DIR, assignment.mdPath), markdown, 'utf-8');

  res.redirect(`/teacher/assignment/${assignment.id}/edit?saved=1`);
});

router.post('/api/preview', requireRole('teacher'), (req, res) => {
  const markdown = typeof req.body.markdown === 'string' ? req.body.markdown : '';
  const html = renderMarkdown(markdown);
  res.json({ html });
});

router.get('/teacher/assignment/:id/submissions', requireRole('teacher'), (req, res) => {
  const assignment = getAssignments().find((a) => a.id === req.params.id);
  if (!assignment) return res.status(404).render('404');

  const users = getUsers();
  const rows = getSubmissions()
    .filter((s) => s.assignmentId === assignment.id && !s.parentSubmissionId)
    .map((s) => ({ ...s, student: users.find((u) => u.id === s.studentId) }));

  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('submissions-table', {
    user: req.session.user,
    sidebarTree,
    assignment,
    rows,
    activeAssignmentId: assignment.id,
  });
});

const TEACHER_SETTABLE_STATUSES = ['done', 'not_done'];

router.post('/teacher/assignment/:id/submissions/:submissionId/status', requireRole('teacher'), (req, res) => {
  if (!TEACHER_SETTABLE_STATUSES.includes(req.body.status)) {
    return res.status(400).send('Invalid status');
  }
  updateSubmissionStatus(req.params.submissionId, req.body.status, req.body.comment);
  res.redirect(`/teacher/assignment/${req.params.id}/submissions`);
});

router.post('/teacher/assignment/:id/submissions/:submissionId/reopen', requireRole('teacher'), (req, res) => {
  reopenSubmission(req.params.submissionId);
  res.redirect(`/teacher/assignment/${req.params.id}/submissions`);
});

module.exports = router;
