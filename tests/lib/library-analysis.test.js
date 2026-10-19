const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const GENERATOR = path.join(__dirname, '..', '..', 'scripts', 'library-analysis', 'generate.py');
const run = (...args) => execFileSync('python3', [GENERATOR, ...args], { encoding: 'utf-8' });

test('the library statement is text with personal data tables and no code', () => {
  const a = run('--statement', 'student-a');
  assert.strictEqual(run('--statement', 'student-a'), a, 'same student, same data');
  assert.notStrictEqual(run('--statement', 'student-b'), a);
  assert.doesNotMatch(a, /```/, 'no code blocks');
  assert.doesNotMatch(a, /\b(SELECT|INSERT INTO|CREATE TABLE|import |def |execute\()/, 'no code in the text');
  assert.doesNotMatch(a, /\{\{DATA\}\}/);
  assert.strictEqual((a.match(/^\| \d+ \| \d+ \| \d+ \| /gm) || []).length, 28, '28 loans');
  assert.match(a, /^\| 10 \| [^|]+ \| [^|]+ \|$/m, '10 readers');
  for (const stage of ['1. База данных', '2. Безопасные запросы', '3. Запросы с группировкой', '4. Обработка на Python', '5. Ошибки в данных', '6. Отчёт', '7. Выводы']) {
    assert.ok(a.includes(`### ${stage}`), stage);
  }
});

test('the expected values describe the planted data errors of the same data', () => {
  const statement = run('--statement', 'student-a');
  const expected = run('--expected', 'student-a');
  const dup = /Дубликат читателя: id 10 «([^»]+)» = id (\d+)/.exec(expected);
  assert.ok(dup);
  assert.ok(statement.includes(`| 10 | ${dup[1]} |`), 'the duplicate reader is the one in the statement');
  const bad = /Возврат раньше выдачи: выдача (\d+) \((\S+) → (\S+)\)/.exec(expected);
  assert.ok(bad && bad[3] < bad[2]);
  const other = /Даты ДД\.ММ\.ГГГГ: выдачи ([\d, ]+)\./.exec(expected)[1].split(', ');
  assert.strictEqual(other.length, 3);
  for (const id of other) assert.match(statement, new RegExp(`^\\| ${id} \\| \\d+ \\| \\d+ \\| \\d\\d\\.\\d\\d\\.2026 \\|`, 'm'));
});
