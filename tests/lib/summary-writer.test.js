const test = require('node:test');
const assert = require('node:assert');
const { addEntryToSummary, listGroupSections } = require('../../src/lib/summary-writer');

const SAMPLE = [
  '# Summary',
  '',
  '- [Раздел 1]()',
  '  - [Задание 1](section-1/task-1.md)',
  '  - [Задание 2](section-1/task-2.md)',
  '- [Раздел 2]()',
  '  - [Задание 1](section-2/task-1.md)',
  '- [Мои доп. задания]()',
  '  - [Дополнительное задание](individual/student-1/extra-task.md)',
  '',
].join('\n');

test('addEntryToSummary appends a new child at the end of an existing section', () => {
  const result = addEntryToSummary(SAMPLE, {
    sectionTitle: 'Раздел 1',
    title: 'Задание 3',
    mdPath: 'section-1/task-3.md',
  });
  const lines = result.split('\n');
  const sectionIndex = lines.findIndex((l) => l.includes('[Раздел 1]'));
  assert.strictEqual(lines[sectionIndex + 3], '  - [Задание 3](section-1/task-3.md)');
  // The following section must be untouched and still come right after.
  assert.match(lines[sectionIndex + 4], /\[Раздел 2\]/);
});

test('addEntryToSummary appends into the individual-assignments bucket', () => {
  const result = addEntryToSummary(SAMPLE, {
    sectionTitle: 'Мои доп. задания',
    title: 'Новое доп. задание',
    mdPath: 'individual/student-2/new-task.md',
  });
  assert.match(result, /Мои доп\. задания[\s\S]*Дополнительное задание[\s\S]*Новое доп\. задание/);
});

test('addEntryToSummary creates a brand-new section when the title does not exist', () => {
  const result = addEntryToSummary(SAMPLE, {
    sectionTitle: 'Раздел 3',
    title: 'Задание 1',
    mdPath: 'section-3/task-1.md',
  });
  const lines = result.trim().split('\n');
  assert.strictEqual(lines[lines.length - 2], '- [Раздел 3]()');
  assert.strictEqual(lines[lines.length - 1], '  - [Задание 1](section-3/task-1.md)');
});

test('listGroupSections infers each section directory from its existing children', () => {
  const sections = listGroupSections(SAMPLE);
  assert.deepStrictEqual(sections, [
    { title: 'Раздел 1', dir: 'section-1' },
    { title: 'Раздел 2', dir: 'section-2' },
  ]);
});
