// Проверка практических заданий курса «Bash: скрипты в Linux»: скрипт студента прогоняется движком
// (public/js/bash-engine.js) на сервере — по одному разу на каждый тест (свои аргументы, ввод, файлы) — и
// сравнивается ожидаемый вывод (stdout). Движок детерминирован и доступен в Node, поэтому проверку делает
// сервер сам, не доверяя браузеру. Браузер запускает тот же движок только для кнопки «Запустить» и
// мгновенной подсказки по открытым тестам. Тот же runOne используется генератором (scripts/bash-course/build.js)
// для вычисления ожидаемого вывода из эталонного решения.
const B = require('../../../public/js/bash-engine.js');

const MAX_OUTPUT = 20000;

// Хвостовые пробелы в строке и пустые строки в конце не учитываются (как в python-basics-check).
function normalize(text) {
  const lines = String(text == null ? '' : text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
function clip(text) { const s = String(text == null ? '' : text); return s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n…' : s; }

/** Один прогон скрипта на тесте -> результат движка { stdout, stderr, code, error }. */
function runOne(code, test) {
  test = test || {};
  return B.run(String(code || ''), {
    args: Array.isArray(test.args) ? test.args.map(String) : [],
    stdin: test.stdin || '',
    files: test.files || undefined,
    fs: test.fs || undefined,
    env: test.env || undefined,
    now: test.now || undefined,
  });
}

// Тесты в том виде, как их отдаём браузеру: вход (аргументы/ввод/файлы) у всех, ожидаемый вывод — только у открытых.
function publicTests(task) {
  const open = task.openTests == null ? 2 : task.openTests;
  return task.tests.map((t, i) => ({
    args: t.args || [],
    stdin: t.stdin || '',
    files: t.files || null,
    ...(i < open ? { output: t.output } : {}),
  }));
}

// Короткая подсказка без ответа, почему тест не пройден.
function hintFor(test, run) {
  if (run.error && /долго|много/.test(run.error)) return 'Скрипт работал слишком долго (возможно, бесконечный цикл).';
  const got = normalize(run.stdout).split('\n');
  const want = normalize(test.output).split('\n');
  if (!normalize(run.stdout)) return run.stderr ? 'Скрипт ничего не вывел в stdout; есть сообщение об ошибке.' : 'Скрипт ничего не вывел.';
  if (got.length !== want.length) return `Строк вывода: ${got.length}, нужно: ${want.length}.`;
  const line = got.findIndex((g, i) => g !== want[i]);
  return line === -1 ? 'Вывод отличается.' : `Не совпадает строка вывода № ${line + 1}.`;
}

/** Проверяет код на всех тестах задачи -> { tests, passed, total, solved }. Сервер — источник истины. */
function checkTask(task, code) {
  const open = task.openTests == null ? 2 : task.openTests;
  const tests = task.tests.map((test, i) => {
    const run = runOne(code, test);
    const outOk = normalize(run.stdout) === normalize(test.output);
    const codeOk = test.checkCode == null ? true : run.code === test.checkCode;
    const passed = outOk && codeOk;
    const isOpen = i < open;
    return {
      number: i + 1,
      open: isOpen,
      args: test.args || [],
      stdin: test.stdin || '',
      passed,
      actual: clip(run.stdout),
      stderr: clip(run.stderr),
      exitCode: run.code,
      ...(isOpen ? { expected: test.output, expectedCode: test.checkCode } : {}),
      hint: passed ? null : hintFor(test, run),
    };
  });
  const passed = tests.filter((t) => t.passed).length;
  return { tests, passed, total: tests.length, solved: tests.length > 0 && passed === tests.length };
}

module.exports = { runOne, checkTask, publicTests, normalize, MAX_OUTPUT };
