// Данные для админ-раздела веб-контрольной (/admin/web-control): список студентов группы web-2
// с персональным заданием «Каталог на XML и DOM», их сдачами и выгрузкой файлов (код + схема).
// Задание индивидуальное (одно на студента, см. scripts/web-dom-xml/issue.js) — собираем по заголовку.
const fs = require('fs');
const db = require('../../db');
const { resolveSubmissionFile } = require('../submission-files');
const { submissionStatusKey } = require('../admin-data');
const { variantFor } = require('../../../scripts/web-dom-xml/generate');

const TITLE = 'Каталог на XML и DOM (двухстраничный сайт)';

function latestSubmission(assignmentId, studentId) {
  return db
    .getSubmissions()
    .filter((s) => s.assignmentId === assignmentId && s.studentId === studentId)
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0] || null;
}

// Файлы сдачи с ссылками на скачивание (существующий маршрут /admin/submissions/:id/files/:index).
function filesOf(sub) {
  if (!sub) return [];
  return sub.files.map((name, index) => {
    const r = resolveSubmissionFile(sub, index);
    return { name, index, available: !r.error, url: `/admin/submissions/${sub.id}/files/${index}` };
  });
}

function rowFor(assignment) {
  const student = db.getUserById(assignment.targetStudentId) || { id: assignment.targetStudentId, name: assignment.targetStudentId };
  const sub = latestSubmission(assignment.id, assignment.targetStudentId);
  const v = variantFor(student.id, student.name, student.id);
  const statusKey = sub ? submissionStatusKey(sub) : 'not_submitted';
  return {
    student,
    assignment,
    submission: sub,
    files: filesOf(sub),
    statusKey,
    theme: v.theme.catalog,
    submittedAt: sub ? sub.submittedAt : null,
  };
}

// Задания веб-контрольной (по одному на студента).
function controlAssignments() {
  return db.getAssignments().filter((a) => a.targetType === 'individual' && a.title === TITLE);
}

function overview() {
  const rows = controlAssignments()
    .map(rowFor)
    .sort((a, b) => (a.student.name || '').localeCompare(b.student.name || '', 'ru'));
  return {
    title: TITLE,
    rows,
    total: rows.length,
    submitted: rows.filter((r) => r.submission).length,
    issued: rows.length > 0,
  };
}

// Папка для архива одного студента: «Имя (логин)», только безопасные символы.
function safeFolder(student) {
  return `${student.name || student.id} (${student.id})`.replace(/[\\/:*?"<>|]+/g, '_').trim();
}

// Записи для общего zip: файлы каждого студента в своей папке. content — Buffer (бинарь сохраняется).
function allZipEntries() {
  const entries = [];
  for (const row of overview().rows) {
    if (!row.submission) continue;
    row.submission.files.forEach((name, index) => {
      const r = resolveSubmissionFile(row.submission, index);
      if (r.error) return;
      entries.push({ name: `${safeFolder(row.student)}/${name}`, content: fs.readFileSync(r.path) });
    });
  }
  return entries;
}

module.exports = { TITLE, overview, allZipEntries, safeFolder };
