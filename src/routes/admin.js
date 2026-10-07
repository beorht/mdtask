const express = require('express');
const { requireRole } = require('../middleware/auth');
const { getDistinctStudentGroups, getSubmissionById, reviewSubmission, getSqlExercise, getSqlAttempts } = require('../db');
const { TOPIC_LABELS } = require('../lib/sql-topics');
const { renderMarkdown, highlightToHtml } = require('../lib/markdown');
const {
  listSections,
  parseAssignmentForm,
  createAssignmentWithContent,
  readAssignmentMarkdown,
  updateAssignmentWithContent,
} = require('../lib/assignment-content');
const { resolveSubmissionFile } = require('../lib/submission-files');
const { isZip, listZip, previewZipEntry } = require('../lib/zip-preview');
const data = require('../lib/admin-data');
const view = require('../lib/admin-view');

const router = express.Router();

// Everything under /admin is the teacher's workspace.
router.use('/admin', requireRole('teacher'));

// Shared locals: helpers, the nav badge (works awaiting review), one-shot flash message.
router.use('/admin', (req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.view = view;
  res.locals.icon = view.icon;
  res.locals.STATUS_META = data.STATUS_META;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.nav = '';
  res.locals.searchQuery = '';
  try {
    res.locals.reviewCount = data.reviewQueue(data.loadContext()).length;
  } catch (err) {
    res.locals.reviewCount = 0;
  }
  next();
});

function flash(req, type, text) {
  req.session.flash = { type, text };
}

function render(res, template, nav, locals) {
  res.render(`admin/${template}`, { nav, ...locals });
}

function notFound(res, text = 'Такой страницы нет или она была удалена.') {
  res.status(404);
  return render(res, 'error', '', {
    pageTitle: 'Не найдено',
    errorTitle: 'Страница не найдена',
    errorText: text,
    retry: false,
  });
}

// --- Dashboard ---

router.get('/admin', (req, res) => {
  const ctx = data.loadContext();
  const { stats, queue } = data.dashboard(ctx);
  render(res, 'dashboard', 'dashboard', {
    pageTitle: 'Dashboard',
    stats,
    queue: queue.slice(0, 8),
    queueTotal: queue.length,
  });
});

// --- Student works ---

router.get('/admin/submissions', (req, res) => {
  const ctx = data.loadContext();
  const filters = data.normalizeWorkFilters(req.query);
  render(res, 'submissions', 'submissions', {
    pageTitle: 'Работы студентов',
    filters,
    works: data.filterWorks(ctx, filters),
    counts: data.tabCounts(ctx),
    courses: ctx.courses,
    groups: getDistinctStudentGroups(),
    hasFilters: !!(filters.q || filters.course || filters.group || filters.status || filters.date),
  });
});

function buildFiles(submission, selectedFile, selectedEntry) {
  return submission.files.map((name, index) => {
    const resolved = resolveSubmissionFile(submission, index);
    const file = { index, name, available: !resolved.error, zip: isZip(name) };
    if (file.available && file.zip) {
      const listing = listZip(resolved.path);
      file.entries = listing.entries || [];
      file.listError = listing.error || null;
    }
    file.selected = index === selectedFile;
    file.selectedEntry = file.selected ? selectedEntry : null;
    return file;
  });
}

// Picks what to show in the preview pane: the requested entry, or else the first
// readable source file in the first zip, so the teacher lands directly on code.
function pickPreview(submission, files, query) {
  let fileIndex = query.file !== undefined ? Number(query.file) : null;
  let entryIndex = query.entry !== undefined ? Number(query.entry) : null;

  if (fileIndex === null) {
    const firstZip = files.find((f) => f.zip && f.entries && f.entries.some((e) => e.previewable));
    if (!firstZip) return null;
    fileIndex = firstZip.index;
    entryIndex = firstZip.entries.find((e) => e.previewable).index;
  }

  const file = files[fileIndex];
  if (!file || !file.available || !file.zip || entryIndex === null) return null;
  const resolved = resolveSubmissionFile(submission, fileIndex);
  const preview = previewZipEntry(resolved.path, entryIndex);
  preview.fileIndex = fileIndex;
  preview.entryIndex = entryIndex;
  if (preview.text !== undefined) {
    // A trailing newline is the end of the last line, not an extra empty one.
    const text = preview.text.replace(/\r?\n$/, '');
    preview.html = highlightToHtml(text, preview.language).value;
    preview.lineCount = text.split('\n').length;
  }
  return preview;
}

router.get('/admin/submissions/:id', (req, res) => {
  const ctx = data.loadContext();
  const submission = getSubmissionById(req.params.id);
  if (!submission) return notFound(res, 'Эта работа не найдена — возможно, ссылка устарела.');

  const assignment = ctx.assignmentById.get(submission.assignmentId);
  const student = ctx.userById.get(submission.studentId);
  if (!assignment || !student) return notFound(res);

  const statusKey = data.submissionStatusKey(submission);
  const latest = ctx.latestByPair.get(`${assignment.id}::${student.id}`);
  const history = ctx.submissions
    .filter((s) => s.assignmentId === assignment.id && s.studentId === student.id)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .map((s) => ({ submission: s, statusKey: data.submissionStatusKey(s) }));

  const files = buildFiles(submission, req.query.file !== undefined ? Number(req.query.file) : null, null);
  const preview = pickPreview(submission, files, req.query);
  if (preview) {
    files.forEach((f) => {
      f.selected = f.index === preview.fileIndex;
      f.selectedEntry = f.selected ? preview.entryIndex : null;
    });
  }

  const queue = data.reviewQueue(ctx);
  const position = queue.findIndex((w) => w.id === submission.id);

  render(res, 'review', 'submissions', {
    pageTitle: `Проверка: ${student.name}`,
    submission,
    assignment,
    student,
    course: ctx.courseById.get(assignment.courseId) || null,
    statusKey,
    isLatest: !latest || latest.id === submission.id,
    latestId: latest ? latest.id : null,
    history,
    files,
    preview,
    conditionHtml: renderMarkdown(readAssignmentMarkdown(assignment)),
    late: submission.submittedAt && new Date(submission.submittedAt) > new Date(assignment.dueDate),
    queuePosition: position === -1 ? null : position + 1,
    queueLength: queue.length,
    next: data.nextInQueue(ctx, submission.id),
    saved: req.query.saved === '1',
  });
});

const VERDICTS = { done: 'Выполнено', not_done: 'Не выполнено', resubmit: 'Отправлено на пересдачу' };

router.post('/admin/submissions/:id/review', (req, res) => {
  const submission = getSubmissionById(req.params.id);
  if (!submission) return notFound(res);

  const verdict = req.body.verdict;
  if (!VERDICTS[verdict]) {
    flash(req, 'error', 'Выберите результат проверки.');
    return res.redirect(`/admin/submissions/${submission.id}`);
  }
  const comment = (req.body.comment || '').trim();

  reviewSubmission(submission.id, verdict, comment, req.session.user.id);

  if (req.body.next === '1') {
    const next = data.nextInQueue(data.loadContext(), submission.id);
    flash(req, 'success', `Сохранено: ${VERDICTS[verdict]}.${next ? '' : ' Все работы проверены.'}`);
    return res.redirect(next ? `/admin/submissions/${next.id}` : '/admin/submissions?tab=review');
  }
  flash(req, 'success', `Сохранено: ${VERDICTS[verdict]}.`);
  res.redirect(`/admin/submissions/${submission.id}`);
});

router.get('/admin/submissions/:id/files/:index', (req, res) => {
  const submission = getSubmissionById(req.params.id);
  if (!submission) return notFound(res);
  const file = resolveSubmissionFile(submission, req.params.index);
  if (file.error === 'invalid') return res.status(400).send('Invalid file path');
  if (file.error) return notFound(res, 'Файл не найден на сервере.');
  res.download(file.path, file.name);
});

// --- Assignments ---

function assignmentFilters(query) {
  return {
    q: (query.q || '').trim(),
    course: query.course || '',
    type: ['group', 'individual'].includes(query.type) ? query.type : '',
    state: ['review', 'open', 'closed'].includes(query.state) ? query.state : '',
  };
}

router.get('/admin/assignments', (req, res) => {
  const ctx = data.loadContext();
  const filters = assignmentFilters(req.query);
  render(res, 'assignments', 'assignments', {
    pageTitle: 'Задания',
    filters,
    rows: data.assignmentRows(ctx, filters),
    courses: ctx.courses,
    hasFilters: !!(filters.q || filters.course || filters.type || filters.state),
  });
});

function assignmentFormLocals(ctx, overrides) {
  return {
    pageTitle: 'Новое задание',
    courses: ctx.courses,
    sections: listSections(),
    students: ctx.students,
    groups: getDistinctStudentGroups(),
    form: { courseId: ctx.courses[0] ? ctx.courses[0].id : '', targetType: 'group', targetGroup: '' },
    markdown: '',
    error: null,
    ...overrides,
  };
}

router.get('/admin/assignments/new', (req, res) => {
  const ctx = data.loadContext();
  const locals = assignmentFormLocals(ctx, {});
  if (req.query.course) locals.form.courseId = req.query.course;
  render(res, 'assignment-new', 'assignments', locals);
});

router.post('/admin/assignments', (req, res) => {
  const ctx = data.loadContext();
  const course = ctx.courseById.get(req.body.courseId);
  const { form, error } = parseAssignmentForm(req.body);
  const markdown = typeof req.body.markdown === 'string' ? req.body.markdown : '';

  if (error || !course) {
    res.status(400);
    return render(
      res,
      'assignment-new',
      'assignments',
      assignmentFormLocals(ctx, {
        form: { ...form, courseId: req.body.courseId },
        markdown,
        error: course ? error : 'Выберите курс.',
      })
    );
  }

  const body = markdown.trim() ? markdown : `# ${form.title}\n\nОписание задания.\n`;
  const assignment = createAssignmentWithContent(course.id, form, body);
  flash(req, 'success', `Задание «${assignment.title}» создано.`);
  res.redirect(`/admin/assignments/${assignment.id}`);
});

router.get('/admin/assignments/:id', (req, res) => {
  const ctx = data.loadContext();
  const assignment = ctx.assignmentById.get(req.params.id);
  if (!assignment) return notFound(res, 'Задание не найдено.');
  render(res, 'assignment-detail', 'assignments', {
    pageTitle: assignment.title,
    detail: data.assignmentDetail(ctx, assignment),
    conditionHtml: renderMarkdown(readAssignmentMarkdown(assignment)),
  });
});

router.get('/admin/assignments/:id/edit', (req, res) => {
  const ctx = data.loadContext();
  const assignment = ctx.assignmentById.get(req.params.id);
  if (!assignment) return notFound(res, 'Задание не найдено.');
  render(res, 'assignment-edit', 'assignments', {
    pageTitle: `Редактирование: ${assignment.title}`,
    assignment,
    form: { title: assignment.title, dueDate: assignment.dueDate },
    markdown: readAssignmentMarkdown(assignment),
    error: null,
  });
});

router.post('/admin/assignments/:id/edit', (req, res) => {
  const ctx = data.loadContext();
  const assignment = ctx.assignmentById.get(req.params.id);
  if (!assignment) return notFound(res, 'Задание не найдено.');

  const title = (req.body.title || '').trim();
  const dueDate = req.body.dueDate || '';
  const markdown = typeof req.body.markdown === 'string' ? req.body.markdown : '';
  if (!title || !dueDate) {
    res.status(400);
    return render(res, 'assignment-edit', 'assignments', {
      pageTitle: `Редактирование: ${assignment.title}`,
      assignment,
      form: { title, dueDate },
      markdown,
      error: 'Название и дедлайн обязательны.',
    });
  }

  updateAssignmentWithContent(assignment, { title, dueDate, markdown });
  flash(req, 'success', 'Изменения сохранены.');
  res.redirect(`/admin/assignments/${assignment.id}`);
});

// --- Students ---

router.get('/admin/students', (req, res) => {
  const ctx = data.loadContext();
  const filters = { q: (req.query.q || '').trim(), group: req.query.group || '' };
  render(res, 'students', 'students', {
    pageTitle: 'Студенты',
    filters,
    rows: data.studentRows(ctx, filters),
    groups: getDistinctStudentGroups(),
    hasFilters: !!(filters.q || filters.group),
  });
});

router.get('/admin/students/:id', (req, res) => {
  const ctx = data.loadContext();
  const student = ctx.students.find((s) => s.id === req.params.id);
  if (!student) return notFound(res, 'Студент не найден.');
  render(res, 'student-profile', 'students', {
    pageTitle: student.name,
    profile: data.studentProfile(ctx, student),
  });
});

// --- Courses ---

router.get('/admin/courses', (req, res) => {
  const ctx = data.loadContext();
  render(res, 'courses', 'courses', { pageTitle: 'Курсы', rows: data.courseRows(ctx) });
});

router.get('/admin/courses/:id', (req, res) => {
  const ctx = data.loadContext();
  const course = ctx.courseById.get(req.params.id);
  if (!course) return notFound(res, 'Курс не найден.');
  render(res, 'course-detail', 'courses', { pageTitle: course.title, detail: data.courseDetail(ctx, course) });
});

// --- Trainer ---

router.get('/admin/trainer', (req, res) => {
  const ctx = data.loadContext();
  const filters = { q: (req.query.q || '').trim(), group: req.query.group || '' };
  render(res, 'trainer', 'trainer', {
    pageTitle: 'Тренажёр SQL',
    filters,
    overview: data.trainerOverview(ctx, filters),
    groups: getDistinctStudentGroups(),
  });
});

router.get('/admin/trainer/results', (req, res) => {
  const ctx = data.loadContext();
  const filters = { q: (req.query.q || '').trim(), group: req.query.group || '' };
  render(res, 'trainer-results', 'trainer', {
    pageTitle: 'Результаты тренажёра',
    filters,
    matrix: data.trainerMatrix(ctx, filters),
    groups: getDistinctStudentGroups(),
  });
});

router.get('/admin/trainer/:studentId/:exerciseId', (req, res) => {
  const ctx = data.loadContext();
  const student = ctx.students.find((s) => s.id === req.params.studentId);
  const exercise = getSqlExercise(req.params.exerciseId);
  if (!student || !exercise) return notFound(res, 'Студент или упражнение не найдены.');
  render(res, 'trainer-attempts', 'trainer', {
    pageTitle: `${student.name} — ${exercise.title}`,
    student,
    exercise,
    descriptionHtml: renderMarkdown(exercise.descriptionMd),
    topicLabel: TOPIC_LABELS[exercise.topic] || exercise.topic,
    attempts: getSqlAttempts(exercise.id, student.id),
  });
});

// --- Information security (ib/) ---

router.get('/admin/ib', (req, res) => {
  const ctx = data.loadContext();
  const filters = { q: (req.query.q || '').trim(), group: req.query.group || '' };
  render(res, 'ib', 'ib', {
    pageTitle: 'Информационная безопасность',
    filters,
    results: data.ibResults(ctx, filters),
    groups: getDistinctStudentGroups(),
  });
});

// --- Settings ---

router.get('/admin/settings', (req, res) => {
  const ctx = data.loadContext();
  render(res, 'settings', 'settings', {
    pageTitle: 'Настройки',
    counts: { students: ctx.students.length, assignments: ctx.assignments.length, courses: ctx.courses.length },
  });
});

// --- Global search ---

function searchJson(result) {
  return {
    query: result.query,
    students: result.students.map((s) => ({ title: s.name, meta: s.group || '', url: `/admin/students/${s.id}` })),
    assignments: result.assignments.map((a) => ({ title: a.title, meta: `до ${view.formatDate(a.dueDate)}`, url: `/admin/assignments/${a.id}` })),
    courses: result.courses.map((c) => ({ title: c.title, meta: 'Курс', url: `/admin/courses/${c.id}` })),
    works: result.works.map((w) => ({
      title: `${w.student.name} — ${w.assignment.title}`,
      meta: w.status.label,
      url: `/admin/submissions/${w.id}`,
    })),
  };
}

router.get('/admin/search', (req, res) => {
  const result = data.search(data.loadContext(), req.query.q);
  if (req.query.format === 'json') return res.json(searchJson(result));
  render(res, 'search', '', { pageTitle: 'Поиск', result, searchQuery: result.query });
});

// --- Fallbacks: unknown /admin page and friendly error page ---

router.use('/admin', (req, res) => notFound(res));

// eslint-disable-next-line no-unused-vars
router.use('/admin', (err, req, res, next) => {
  console.error(err);
  res.status(500);
  render(res, 'error', '', {
    pageTitle: 'Ошибка',
    errorTitle: 'Не удалось загрузить страницу',
    errorText: 'Что-то пошло не так на сервере. Попробуйте обновить страницу.',
    retry: true,
  });
});

module.exports = router;
