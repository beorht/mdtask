// Stage 3.3–3.7 of the IB final exam: a ready program with a bug — find it, fix it, run it.
// Programs live in content/exam/bugs/<theme>/<id>.py with their description and tests in
// <id>.json (built by scripts/exam/build-bugs.py from the fixed reference). A student gets one
// program of each of the five bug types of their theme, in one of two versions.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'exam', 'bugs');
const BUG_TYPES = {
  1: 'Граница цикла',
  2: 'Неверное условие',
  3: 'Тип данных',
  4: 'Накопитель или return в цикле',
  5: 'Работа со словарём',
};
// Runs and the single submission of a bug task.
const MAX_RUNS = 4;
const OPEN_TESTS = 1;

const cache = new Map();

function loadProgram(themeKey, short) {
  const key = `${themeKey}/${short}`;
  if (!cache.has(key)) {
    const meta = JSON.parse(fs.readFileSync(path.join(DIR, themeKey, `${short}.json`), 'utf-8'));
    const code = fs.readFileSync(path.join(DIR, themeKey, `${short}.py`), 'utf-8');
    cache.set(key, { ...meta, short, code });
  }
  return cache.get(key);
}

// Versions of the five programs by the student's position in the group list.
function bugRefs(index) {
  return [1, 2, 3, 4, 5].map((type) => `${type}${(index + type) % 2 === 0 ? 'a' : 'b'}`);
}

function bugTask(themeKey, short, number) {
  const program = loadProgram(themeKey, short);
  return {
    id: `3.${number}`,
    kind: 'bug',
    program: program.id,
    bugType: program.type,
    bugTypeLabel: BUG_TYPES[program.type],
    title: program.title,
    description: program.description,
    starter: program.code,
    tests: program.tests,
    openTests: OPEN_TESTS,
    points: 4,
  };
}

module.exports = { BUG_TYPES, MAX_RUNS, bugRefs, bugTask, loadProgram };
