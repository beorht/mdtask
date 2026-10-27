const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TASKS } = require('../../src/lib/python-basics');
const { normalize, publicTests, checkRuns } = require('../../src/lib/python-basics-check');

const ROOT = path.join(__dirname, '..', '..');
const SOLUTIONS = path.join(ROOT, 'scripts', 'python-basics', 'solutions');

test('five tasks on variables and data types, each with theory, statement and enough tests', () => {
  // The course is in Uzbek (Latin script): no Cyrillic outside quoted program output.
  for (const t of TASKS) {
    assert.doesNotMatch(t.title + t.topics.join(' '), /[А-Яа-яЁё]/, `${t.id}: название`);
    assert.doesNotMatch(t.theoryMd, /[А-Яа-яЁё]/, `${t.id}: теория`);
    assert.doesNotMatch(t.taskMd.replace(/`[^`]*`/g, ''), /[А-Яа-яЁё]/, `${t.id}: условие`);
  }
  assert.strictEqual(TASKS.length, 5);
  TASKS.forEach((t, i) => {
    assert.strictEqual(t.number, i + 1);
    assert.ok(t.theoryMd.length > 500, `${t.id}: теория`);
    assert.ok(t.taskMd.length > 100, `${t.id}: условие`);
    assert.ok(t.tests.length >= 4 && t.openTests < t.tests.length, `${t.id}: тесты`);
    assert.ok(fs.existsSync(path.join(SOLUTIONS, `${t.id}.py`)), `${t.id}: эталон`);
  });
});

test('theory and statements give no code: no code blocks and no line of a reference solution', () => {
  for (const t of TASKS) {
    for (const [name, md] of [['theory', t.theoryMd], ['task', t.taskMd]]) {
      assert.doesNotMatch(md, /```|^ {4}\S/m, `${t.id}/${name}: блок кода`);
      const solution = fs.readFileSync(path.join(SOLUTIONS, `${t.id}.py`), 'utf-8');
      for (const line of solution.split('\n').map((l) => l.trim()).filter(Boolean)) {
        assert.ok(!md.includes(line), `${t.id}/${name} содержит строку эталона: ${line}`);
      }
    }
  }
});

test('reference solutions pass every test (scripts/python-basics/check.py --reference)', () => {
  const r = spawnSync(process.env.IB_PYTHON || 'python3', [path.join(ROOT, 'scripts', 'python-basics', 'check.py'), '--reference', '-q'], { encoding: 'utf-8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

test('normalize ignores trailing spaces, CRLF and trailing blank lines only', () => {
  assert.strictEqual(normalize('a  \r\nb\t\n\n\n'), 'a\nb');
  assert.notStrictEqual(normalize(' a'), normalize('a'));
  assert.notStrictEqual(normalize('a\n\nb'), normalize('a\nb'));
});

test('publicTests hides the expected output of closed tests', () => {
  const t = TASKS[1];
  const pub = publicTests(t);
  assert.strictEqual(pub.length, t.tests.length);
  pub.forEach((p, i) => {
    assert.deepStrictEqual(p.input, t.tests[i].input);
    assert.strictEqual('output' in p, i < t.openTests);
  });
});

test('checkRuns: correct outputs solve the task; wrong, error and timeout runs fail with a hint', () => {
  const t = TASKS[0];
  const good = t.tests.map((x) => ({ stdout: x.output + '\n  ' }));
  const ok = checkRuns(t, good);
  assert.strictEqual(ok.solved, true);
  assert.strictEqual(ok.passed, t.tests.length);

  const runs = good.slice();
  runs[0] = { stdout: 'Привет\n' };
  runs[2] = { stdout: '', error: "NameError: name 'nme' is not defined" };
  runs[3] = { stdout: '', timeout: true };
  const bad = checkRuns(t, runs);
  assert.strictEqual(bad.solved, false);
  assert.strictEqual(bad.passed, t.tests.length - 3);
  assert.match(bad.tests[0].hint, /1 ta qator chiqardi, kerak: 2/);
  assert.strictEqual(bad.tests[0].expected, t.tests[0].output); // open test
  assert.ok(!('expected' in bad.tests[2])); // closed test
  assert.match(bad.tests[2].hint, /NameError/);
  assert.match(bad.tests[3].hint, /5 soniyadan/);
  assert.throws(() => checkRuns(t, runs.slice(1)), /natijasi kerak/);
});
