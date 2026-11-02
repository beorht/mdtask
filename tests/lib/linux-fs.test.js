// Движок виртуальной ФС предмета «Linux Terminal Trainer» (public/js/linux-fs.js): команды и их
// последствия для файловой системы, разрешение путей, ошибки, снимок дерева, детерминизм (повтор журнала).
const test = require('node:test');
const assert = require('node:assert');
const LinuxFS = require('../../public/js/linux-fs.js');

const SPEC = {
  home: { student: {
    Desktop: {},
    Documents: { 'report.txt': 'hello\n', Projects: { app: {}, data: {} }, Reports: {} },
    Downloads: {},
    '.hidden': 'secret\n',
  } },
};

const mk = () => LinuxFS.createState(SPEC);
const run = (s, line) => LinuxFS.run(s, line);
// Запускает список команд, возвращает состояние.
function runAll(lines) {
  const s = mk();
  for (const l of lines) run(s, l);
  return s;
}
const exists = (s, p) => LinuxFS.getNode(s, LinuxFS.resolvePath(s, p)) != null;
const isDir = (s, p) => { const n = LinuxFS.getNode(s, LinuxFS.resolvePath(s, p)); return n && n.type === 'dir'; };
const content = (s, p) => { const n = LinuxFS.getNode(s, LinuxFS.resolvePath(s, p)); return n && n.type === 'file' ? n.content : null; };

test('pwd, whoami, clear, prompt', () => {
  const s = mk();
  assert.strictEqual(run(s, 'pwd').out, '/home/student');
  assert.strictEqual(run(s, 'whoami').out, 'student');
  assert.strictEqual(run(s, 'clear').cleared, true);
  assert.strictEqual(LinuxFS.prompt(s), 'student@linux:~$ ');
});

test('ls: current, path, hidden, long', () => {
  const s = mk();
  assert.strictEqual(run(s, 'ls').out, 'Desktop/  Documents/  Downloads/');
  assert.ok(run(s, 'ls -a').out.includes('.hidden'));
  assert.strictEqual(run(s, 'ls Documents').out, 'Projects/  report.txt  Reports/');
  assert.match(run(s, 'ls -l').out, /drwxr-xr-x .* Documents\//);
  assert.match(run(s, 'ls nope').err, /Нет такого файла/);
});

test('tree: structure and -L depth', () => {
  const s = mk();
  const out = run(s, 'tree Documents').out;
  assert.match(out, /├── Projects/);
  assert.match(out, /│   ├── app/);
  assert.match(out, /directories,/);
  const shallow = run(s, 'tree -L 1 Documents').out;
  assert.ok(!shallow.includes('app'), '-L 1 не показывает вложенные уровни');
});

test('cd: relative, .., ~, /, absolute, -, errors', () => {
  const s = mk();
  run(s, 'cd Documents'); assert.strictEqual(run(s, 'pwd').out, '/home/student/Documents');
  run(s, 'cd Projects'); assert.strictEqual(run(s, 'pwd').out, '/home/student/Documents/Projects');
  run(s, 'cd ..'); assert.strictEqual(run(s, 'pwd').out, '/home/student/Documents');
  run(s, 'cd ~'); assert.strictEqual(run(s, 'pwd').out, '/home/student');
  run(s, 'cd /'); assert.strictEqual(run(s, 'pwd').out, '/');
  run(s, 'cd /home/student/Downloads'); assert.strictEqual(run(s, 'pwd').out, '/home/student/Downloads');
  run(s, 'cd -'); assert.strictEqual(run(s, 'pwd').out, '/', 'cd - возвращает в предыдущую');
  assert.match(run(s, 'cd nope').err, /Нет такого файла/);
  assert.match(run(s, 'cd /home/student/Downloads/../Documents/report.txt').err, /Это не каталог/);
});

test('deep navigation then up to Downloads', () => {
  const s = runAll(['mkdir -p Documents/Projects/Python/src', 'cd Documents/Projects/Python/src',
    'cd ../../../../Downloads']);
  assert.strictEqual(run(s, 'pwd').out, '/home/student/Downloads');
});

test('mkdir: simple, -p nested, error exists', () => {
  const s = mk();
  run(s, 'mkdir Images'); assert.ok(isDir(s, 'Images'));
  run(s, 'mkdir -p Projects/Web/Frontend'); assert.ok(isDir(s, 'Projects/Web/Frontend'));
  assert.match(run(s, 'mkdir Images').err, /Файл существует/);
});

test('rmdir: empty only', () => {
  const s = mk();
  run(s, 'mkdir Test'); run(s, 'rmdir Test'); assert.ok(!exists(s, 'Test'));
  assert.match(run(s, 'rmdir Documents').err, /Каталог не пуст/);
  assert.ok(isDir(s, 'Documents'));
});

test('rm: file, -r dir, dir without -r errors, -f missing ok', () => {
  const s = mk();
  run(s, 'rm Documents/report.txt'); assert.ok(!exists(s, 'Documents/report.txt'));
  assert.match(run(s, 'rm Documents').err, /Это каталог/);
  run(s, 'rm -r Documents'); assert.ok(!exists(s, 'Documents'));
  assert.strictEqual(run(s, 'rm -f nope.txt').err, null);
});

test('cat: content, missing, dir', () => {
  const s = mk();
  assert.strictEqual(run(s, 'cat Documents/report.txt').out, 'hello');
  assert.match(run(s, 'cat nope').err, /Нет такого файла/);
  assert.match(run(s, 'cat Documents').err, /Это каталог/);
});

test('echo: print, > create, >> append', () => {
  const s = mk();
  assert.strictEqual(run(s, 'echo Hello').out, 'Hello');
  assert.strictEqual(run(s, 'echo "a b" c').out, 'a b c');
  run(s, 'echo "Name: Student" > student.txt');
  run(s, 'echo "Course: Linux" >> student.txt');
  assert.strictEqual(content(s, 'student.txt'), 'Name: Student\nCourse: Linux\n');
  run(s, 'echo one > student.txt'); // перезапись
  assert.strictEqual(content(s, 'student.txt'), 'one\n');
});

test('cp: into dir, rename, -r dir, original stays', () => {
  const s = mk();
  run(s, 'echo text > notes.txt');
  run(s, 'cp notes.txt backup.txt'); assert.strictEqual(content(s, 'backup.txt'), 'text\n');
  assert.ok(exists(s, 'notes.txt'), 'оригинал остаётся');
  run(s, 'cp notes.txt Documents/'); assert.ok(exists(s, 'Documents/notes.txt'));
  assert.match(run(s, 'cp Documents Backup').err, /-r не указан/);
  run(s, 'cp -r Documents Backup'); assert.ok(isDir(s, 'Backup') && exists(s, 'Backup/report.txt'));
});

test('mv: move, rename, original gone', () => {
  const s = mk();
  run(s, 'mkdir Projects2'); run(s, 'echo m > Projects2/main.txt');
  run(s, 'mv Projects2/main.txt Documents/');
  assert.ok(exists(s, 'Documents/main.txt') && !exists(s, 'Projects2/main.txt'));
  run(s, 'mv Documents/main.txt Documents/main_backup.txt');
  assert.ok(exists(s, 'Documents/main_backup.txt') && !exists(s, 'Documents/main.txt'));
  run(s, 'mv Documents Projects2/'); assert.ok(isDir(s, 'Projects2/Documents') && !exists(s, 'Documents'));
});

test('snapshot for the file-tree UI', () => {
  const s = mk();
  const snap = LinuxFS.snapshot(s, '/home/student');
  assert.strictEqual(snap.type, 'dir');
  const names = snap.children.map((c) => c.name);
  assert.ok(names.includes('Documents') && names.includes('.hidden'));
  const docs = snap.children.find((c) => c.name === 'Documents');
  assert.ok(docs.children.some((c) => c.name === 'report.txt' && c.type === 'file'));
});

test('determinism: replaying a command log reaches the same final state (server recheck)', () => {
  const log = ['mkdir MyProject', 'cd MyProject', 'mkdir Documents Images Sources',
    'echo "report" > Documents/report.txt', 'cp Sources/.keep Sources/backup 2>/dev/null',
    'cd ..'];
  const a = runAll(log);
  const b = runAll(log);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a.root)), JSON.parse(JSON.stringify(b.root)));
  assert.ok(isDir(a, 'MyProject/Documents') && content(a, 'MyProject/Documents/report.txt') === 'report\n');
});
