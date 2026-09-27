const express = require('express');
const { requireRole } = require('../middleware/auth');
const { renderMarkdown } = require('../lib/markdown');

// The classic teacher UI was replaced by the admin panel (/admin). This router keeps
// the markdown preview API the admin editor uses, and redirects old /teacher links
// (bookmarks, links in the student-facing sidebar) to their admin equivalents.

const router = express.Router();

router.post('/api/preview', requireRole('teacher'), (req, res) => {
  const markdown = typeof req.body.markdown === 'string' ? req.body.markdown : '';
  res.json({ html: renderMarkdown(markdown) });
});

const teacher = requireRole('teacher');
const to = (fn) => (req, res) => res.redirect(fn(req.params, req));
const enc = encodeURIComponent;

router.get('/teacher', teacher, to(() => '/admin'));
router.get('/teacher/courses/:courseId/assignments/new', teacher, to((p) => `/admin/assignments/new?course=${enc(p.courseId)}`));
router.get('/teacher/assignment/:id/edit', teacher, to((p) => `/admin/assignments/${enc(p.id)}/edit`));
router.get('/teacher/assignment/:id/submissions', teacher, to((p) => `/admin/assignments/${enc(p.id)}`));
router.get('/teacher/assignment/:id/submissions/:submissionId/files/:index', teacher, to(
  (p) => `/admin/submissions/${enc(p.submissionId)}/files/${enc(p.index)}`
));

module.exports = router;
