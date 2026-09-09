// tests/lib/summary-parser.test.js
const test = require('node:test');
const assert = require('node:assert');
const { parseSummary } = require('../../src/lib/summary-parser');

test('parseSummary builds a nested tree from indentation', () => {
  const text = [
    '# Summary',
    '',
    '- [Раздел 1]()',
    '  - [Задание 1](section-1/task-1.md)',
    '  - [Задание 2](section-1/task-2.md)',
    '- [Раздел 2]()',
    '  - [Задание 1](section-2/task-1.md)',
  ].join('\n');

  const tree = parseSummary(text);

  assert.strictEqual(tree.length, 2);
  assert.strictEqual(tree[0].title, 'Раздел 1');
  assert.strictEqual(tree[0].path, null);
  assert.strictEqual(tree[0].children.length, 2);
  assert.strictEqual(tree[0].children[0].path, 'section-1/task-1.md');
  assert.strictEqual(tree[1].children[0].path, 'section-2/task-1.md');
});
