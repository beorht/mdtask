const fs = require('fs');
const path = require('path');
const { createAssignment, updateAssignmentMeta } = require('../db');
const { slugify } = require('./markdown');
const { addEntryToSummary, renameEntryInSummary, listGroupSections, INDIVIDUAL_SECTION_TITLE } = require('./summary-writer');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');
const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

function readSummary() {
  return fs.readFileSync(SUMMARY_PATH, 'utf-8');
}

function listSections() {
  return listGroupSections(readSummary());
}

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

// Parses and validates the create-assignment form body used by the admin panel.
function parseAssignmentForm(body) {
  const form = {
    title: (body.title || '').trim(),
    dueDate: body.dueDate || '',
    targetType: body.targetType === 'individual' ? 'individual' : 'group',
    sectionTitle: (body.sectionTitle || '').trim(),
    targetStudentId: body.targetStudentId || '',
    targetGroup: (body.targetGroup || '').trim() || null, // empty = all groups
  };
  const missingRequired =
    !form.title ||
    !form.dueDate ||
    (form.targetType === 'group' && !form.sectionTitle) ||
    (form.targetType === 'individual' && !form.targetStudentId);
  return { form, error: missingRequired ? 'Заполните все обязательные поля.' : null };
}

// Writes the markdown file, appends it to SUMMARY.md and inserts the DB row — in that
// order, so a failure never leaves a DB row pointing at a missing file.
function createAssignmentWithContent(courseId, form, markdown) {
  const summaryText = readSummary();
  const sections = listGroupSections(summaryText);

  const dir =
    form.targetType === 'individual' ? `individual/${form.targetStudentId}` : resolveSectionDir(form.sectionTitle, sections);
  const sectionTitle = form.targetType === 'individual' ? INDIVIDUAL_SECTION_TITLE : form.sectionTitle;

  const mdPath = uniqueMdPath(dir, slugify(form.title) || 'zadanie');
  const fullPath = path.join(CONTENT_DIR, mdPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, markdown || `# ${form.title}\n\nОписание задания.\n`, 'utf-8');

  fs.writeFileSync(SUMMARY_PATH, addEntryToSummary(summaryText, { sectionTitle, title: form.title, mdPath }), 'utf-8');

  return createAssignment({
    courseId,
    title: form.title,
    mdPath,
    targetType: form.targetType,
    targetStudentId: form.targetType === 'individual' ? form.targetStudentId : null,
    targetGroup: form.targetType === 'group' ? form.targetGroup : null,
    dueDate: form.dueDate,
  });
}

function readAssignmentMarkdown(assignment) {
  const fullPath = path.join(CONTENT_DIR, assignment.mdPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
}

function writeAssignmentMarkdown(assignment, markdown) {
  const fullPath = path.join(CONTENT_DIR, assignment.mdPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, markdown, 'utf-8');
}

// Saves the admin edit form: markdown body, title and due date. A title change is
// mirrored into SUMMARY.md, which is what the sidebars actually display.
function updateAssignmentWithContent(assignment, { title, dueDate, markdown }) {
  writeAssignmentMarkdown(assignment, markdown);
  if (title !== assignment.title) {
    fs.writeFileSync(SUMMARY_PATH, renameEntryInSummary(readSummary(), { mdPath: assignment.mdPath, title }), 'utf-8');
  }
  updateAssignmentMeta(assignment.id, { title, dueDate });
}

module.exports = {
  CONTENT_DIR,
  listSections,
  parseAssignmentForm,
  createAssignmentWithContent,
  readAssignmentMarkdown,
  writeAssignmentMarkdown,
  updateAssignmentWithContent,
};
