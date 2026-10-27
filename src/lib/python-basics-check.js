// Checks the output of a student's program: the «Начальный Python» course (src/lib/python-course/), the IB exam
// (normalize, publicTests) and the IB detector (normalize). The program runs in the student's browser (Pyodide,
// public/js/python-worker.js) once per test with the test's input lines; the browser sends back only what it
// printed. The expected output stays on the server: only the first `openTests` tests are shown to the student.
// scripts/python-course/check.py applies the same rules (normalize) to a .py file.

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
    throw new Error(`Нужно ${task.tests.length} результатов запуска, пришло: ${Array.isArray(runs) ? runs.length : 0}.`);
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

// A short, answer-free reason a test failed.
function hintFor(test, stdout, error) {
  if (error === 'timeout') return 'Программа работала дольше 5 секунд и была остановлена (бесконечный цикл или лишний input()?).';
  if (error) {
    if (/EOFError/.test(error)) return 'Программа вызывает input() больше раз, чем строк ввода в тесте.';
    return 'Программа завершилась с ошибкой: ' + error;
  }
  const got = normalize(stdout).split('\n');
  const want = normalize(test.output).split('\n');
  if (!normalize(stdout)) return 'Программа ничего не вывела.';
  if (got.length !== want.length) {
    return `Программа вывела строк: ${got.length}, нужно: ${want.length}.`;
  }
  const line = got.findIndex((g, i) => g !== want[i]);
  return `Не совпадает строка вывода № ${line + 1}.`;
}

module.exports = { normalize, publicTests, checkRuns, MAX_OUTPUT };
