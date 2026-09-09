const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { getCourses, getAssignments, getSubmissions } = require('../fixtures');
const { renderMarkdown, extractHeadings } = require('../lib/markdown');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');

const router = express.Router();

router.get('/', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const sidebarTree = buildSidebarTree({ role: 'student', studentId: user.id });
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

  const sidebarTree = buildSidebarTree({ role: 'student', studentId: user.id });

  res.render('assignment-view', {
    user,
    sidebarTree,
    assignment,
    html,
    toc,
    submissions,
    activeAssignmentId: assignment.id,
  });
});

module.exports = router;
