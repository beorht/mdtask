const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { getCourses, getAssignments, getUsers, getSubmissions, updateSubmissionStatus, reopenSubmission } = require('../db');
const { renderMarkdown } = require('../lib/markdown');

const router = express.Router();

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');

router.get('/teacher', requireRole('teacher'), (req, res) => {
  const user = req.session.user;
  const courses = getCourses().filter((c) => c.teacherId === user.id);
  const assignments = getAssignments();
  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('teacher-dashboard', { user, sidebarTree, courses, assignments, activeAssignmentId: null });
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
