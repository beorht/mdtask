// Checks the output of a student's program in «Простое программирование на Python».
// The program runs in the student's browser (public/js/python-basics.js, Pyodide) once per
// test with the test's input lines; the browser sends back only what it printed. The expected
// output stays on the server: only the first `openTests` tests are shown to the student.
// scripts/python-basics/check.py applies the same rules (normalize) to a .py file.

const MAX_OUTPUT = 20000;

// Trailing spaces on a line and blank lines at the end don't count.
function normalize(text) {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function clip(text) {
  const s = String(text || '');
  return s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n…' : s;
}

function isOpen(task, index) {
  return index < task.openTests;
}

// Tests as the page sends them to the browser: input for every test, expected output only for open ones.
function publicTests(task) {
  return task.tests.map((t, i) => ({ input: t.input, ...(isOpen(task, i) ? { output: t.output } : {}) }));
}

// runs: [{ stdout, error, timeout }] in test order (error = last line of the traceback).
function checkRuns(task, runs) {
  if (!Array.isArray(runs) || runs.length !== task.tests.length) {
    throw new Error(`${task.tests.length} ta ishga tushirish natijasi kerak, keldi: ${Array.isArray(runs) ? runs.length : 0}`);
  }
  const tests = task.tests.map((test, i) => {
    const run = runs[i] || {};
    const stdout = clip(run.stdout);
    const error = run.timeout ? 'timeout' : run.error ? clip(run.error).slice(0, 500) : null;
    const passed = !error && normalize(stdout) === normalize(test.output);
    const open = isOpen(task, i);
    return {
      number: i + 1,
      open,
      input: test.input,
      passed,
      error,
      actual: stdout,
      ...(open ? { expected: test.output } : {}),
      hint: passed ? null : hintFor(test, stdout, error),
    };
  });
  const passed = tests.filter((t) => t.passed).length;
  return { tests, passed, total: tests.length, solved: passed === tests.length };
}

// A short, answer-free reason a test failed (in Uzbek, like the whole course).
function hintFor(test, stdout, error) {
  if (error === 'timeout') return 'Dastur 5 soniyadan ko‘proq ishladi va to‘xtatildi (cheksiz sikl yoki ortiqcha input()?).';
  if (error) {
    if (/EOFError/.test(error)) return 'Dastur input() ni testdagi kiritish qatorlaridan ko‘proq marta chaqiryapti.';
    return 'Dastur xato bilan tugadi: ' + error;
  }
  const got = normalize(stdout).split('\n');
  const want = normalize(test.output).split('\n');
  if (!normalize(stdout)) return 'Dastur hech narsa chiqarmadi.';
  if (got.length !== want.length) {
    return `Dastur ${got.length} ta qator chiqardi, kerak: ${want.length} ta.`;
  }
  const line = got.findIndex((g, i) => g !== want[i]);
  return `Chiqishning ${line + 1}-qatori mos kelmaydi.`;
}

module.exports = { normalize, publicTests, checkRuns, MAX_OUTPUT };
