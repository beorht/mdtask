const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { stopTerminal } = require('../../src/lib/ib-bridge');
const db = require('../../src/db');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => db.__resetForTests());
test.after(() => stopTerminal());

test('the information-security card appears on the home page only once a task is assigned', async () => {
  const app = createApp();
  let agent = await loginAs(app, 'student-1');
  assert.doesNotMatch((await agent.get('/')).text, /href="\/subjects\/ib"/);

  db.seedCaesarSecretForTests('student-1');
  agent = await loginAs(app, 'student-1');
  const res = await agent.get('/');
  assert.match(res.text, /href="\/subjects\/ib"/);
  assert.match(res.text, /Информационная безопасность/);
});

test('the subject page lists the assigned task with its status', async () => {
  db.seedCaesarSecretForTests('student-1', { solved: true });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/ib');
  assert.strictEqual(res.status, 200);
  const main = res.text.slice(res.text.indexOf('<main'));
  assert.match(main, /href="\/subjects\/ib\/caesar"/);
  assert.match(main, /Задание №3\. Доступ к защищённой базе данных/);
  assert.match(main, /Выполнено/);
});

test('the task page embeds the terminal; unassigned or unknown tasks are 404', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/ib/caesar');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<iframe class="ib-terminal" src="\/ib\/caesar\/terminal"/);
  assert.strictEqual((await agent.get('/subjects/ib/nope')).status, 404);

  const other = await loginAs(app, 'student-2');
  assert.strictEqual((await other.get('/subjects/ib/caesar')).status, 404);
  assert.strictEqual((await other.get('/ib/caesar/terminal')).status, 404);
});

test('the terminal page is IBEmulator\'s TTY pointed at this task\'s API', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/ib/caesar/terminal');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /window\.SECLAB_API = "\/ib\/caesar\/api"/);
  assert.match(res.text, /seclab login: /);
});

test('the terminal login only accepts the logged-in student', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post('/ib/caesar/api/login').send({ studentId: 'student-2', password: DEFAULT_PASSWORD });
  assert.deepStrictEqual(res.body, { ok: false, error: 'Неверный логин или пароль' });
});

test('terminal commands go to the Python backend, which wants a terminal session first', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post('/ib/caesar/api/run').send({ cmd: 'ls' });
  assert.strictEqual(res.status, 401);
  assert.deepStrictEqual(res.body, { error: 'not authenticated' });
});

test('the old /ctf/caesar terminal redirects to the task page', async () => {
  const app = createApp();
  const res = await request(app).get('/ctf/caesar');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/subjects/ib/caesar');
});

test('the task password is not accepted for the platform login', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'student-1', password: 'Falcon123' });
  assert.match(res.text, /Неверный ID или пароль/);
});

test('teacher sees the task results with answers in /admin/ib', async () => {
  db.seedCaesarSecretForTests('student-1', { solved: true });
  db.seedCaesarSecretForTests('student-2');
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/admin/ib');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /Мария Петрова/);
  assert.match(res.text, /Falcon123/);
  assert.match(res.text, /~\/\.ssh\/\.config\.bak/);
  assert.match(res.text, /href="\/admin\/ib"/);
});

test('task №4 starts with theory: the card leads to the theory page, which links to the practice', async () => {
  db.seedConfigTaskForTests('student-1', { passed: 3 });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const list = await agent.get('/subjects/ib');
  assert.match(list.text, /href="\/subjects\/ib\/configs\/theory"/);
  assert.match(list.text, /Поиск и правка конфигурационных файлов/);
  assert.match(list.text, /выполнено пунктов: 3 из 8/);

  const theory = await agent.get('/subjects/ib/configs/theory');
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /find — поиск файлов/);
  assert.match(theory.text, /sed — изменение текста без редактора/);
  assert.match(theory.text, /href="\/subjects\/ib\/configs">Перейти к практике/);

  const practice = await agent.get('/subjects/ib/configs');
  assert.strictEqual(practice.status, 200);
  assert.match(practice.text, /src="\/ib\/configs\/terminal"/);
  assert.match(practice.text, /href="\/subjects\/ib\/configs\/theory"/);
  assert.match(practice.text, /Выполнено пунктов: 3 из 8/);
});

test('a task without theory has no theory page; task №4 needs its own assignment', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  assert.strictEqual((await agent.get('/subjects/ib/caesar/theory')).status, 404);
  assert.strictEqual((await agent.get('/subjects/ib/configs/theory')).status, 404);
  assert.strictEqual((await agent.get('/ib/configs/terminal')).status, 404);
});

test('the sidebar groups theory and practice of task №4', async () => {
  db.seedConfigTaskForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/ib/configs/theory');
  const nav = res.text.slice(res.text.indexOf('<nav class="sidebar'), res.text.indexOf('</nav>', res.text.indexOf('<nav class="sidebar')));
  assert.match(nav, /Теория/);
  assert.match(nav, /Практика в терминале/);
  assert.match(nav, /0\/8/);
});

test('teacher sees task №4 progress and the student values in /admin/ib', async () => {
  db.seedConfigTaskForTests('student-1', { passed: 8, solved: true });
  db.seedConfigTaskForTests('student-2', { passed: 2 });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/admin/ib');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Задание №4\. Поиск и правка конфигурационных файлов/);
  assert.match(res.text, /2\/8/);
  assert.match(res.text, /В процессе/);
  assert.match(res.text, /8456/);
  assert.match(res.text, /64M/);
});

test('task №5 (terminal trainer) starts with theory and shows stage progress', async () => {
  db.seedTerminalTaskForTests('student-1', { passed: 4 });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const list = await agent.get('/subjects/ib');
  assert.match(list.text, /href="\/subjects\/ib\/terminal\/theory"/);
  assert.match(list.text, /Задание №5\. Основы работы в терминале Linux/);
  assert.match(list.text, /выполнено этапов: 4 из 14/);

  const theory = await agent.get('/subjects/ib/terminal/theory');
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /Этап 1\. Знакомство с терминалом/);
  assert.match(theory.text, /Этап 14\. Итоговое задание/);
  assert.match(theory.text, /href="\/subjects\/ib\/terminal">Перейти к практике/);

  const practice = await agent.get('/subjects/ib/terminal');
  assert.match(practice.text, /src="\/ib\/terminal\/terminal"/);
  assert.match(practice.text, /Выполнено этапов: 4 из 14/);
  assert.match(practice.text, /<code>answer 4\.1 42<\/code>/);

  const nav = practice.text.slice(practice.text.indexOf('<nav class="sidebar'));
  assert.match(nav, /4\/14/);
});

test('task №5 needs its own assignment; the terminal API also offers Tab completion', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  assert.strictEqual((await agent.get('/subjects/ib/terminal')).status, 404);

  db.seedTerminalTaskForTests('student-2');
  const other = await loginAs(app, 'student-2');
  const res = await other.post('/ib/terminal/api/complete').send({ line: 'ls do' });
  assert.strictEqual(res.status, 401);
  assert.deepStrictEqual(res.body, { error: 'not authenticated' });
  assert.strictEqual((await other.post('/ib/terminal/api/nope').send({})).status, 404);
});

test('teacher sees task №5 stages, answers and the command log', async () => {
  db.seedTerminalTaskForTests('student-1', {
    passed: 14,
    solved: true,
    answers: { '2.1': { value: '7', ok: true, at: new Date().toISOString() } },
    attempts: { '2.1': 3 },
    log: ['ls -la', 'sudo !!'],
  });
  db.seedTerminalTaskForTests('student-2', { passed: 3, log: ['pwd'] });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');

  const res = await agent.get('/admin/ib');
  assert.match(res.text, /Задание №5\. Основы работы в терминале Linux/);
  assert.match(res.text, /3\/14/);
  assert.match(res.text, /4\. Чтение файлов: cat, head, tail, wc/);
  assert.match(res.text, /href="\/admin\/ib\/terminal\/student-2"/);

  const detail = await agent.get('/admin/ib/terminal/student-1');
  assert.strictEqual(detail.status, 200);
  assert.match(detail.text, /14\. Итоговое задание/);
  assert.match(detail.text, /\$ sudo !!/);
  assert.match(detail.text, /<code>2\.1<\/code>/);
  assert.match(detail.text, /Неверных ответов/);
  assert.strictEqual((await agent.get('/admin/ib/terminal/student-3')).status, 404);
});

test('task №5 stage titles in mdtask match the Python trainer', () => {
  const { spawnSync } = require('child_process');
  const path = require('path');
  const out = spawnSync(
    'python3',
    ['-c', 'import json, terminal_task; print(json.dumps([s["title"] for s in terminal_task.STAGES], ensure_ascii=False))'],
    { cwd: path.join(__dirname, '..', '..', 'ib', 'server'), encoding: 'utf-8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }
  );
  assert.strictEqual(out.status, 0, out.stderr);
  const { findIbTask } = require('../../src/lib/ib-tasks');
  assert.deepStrictEqual(findIbTask('terminal').stages, JSON.parse(out.stdout));
});

test('tasks №6 and №7 stage titles in mdtask match the Python lab tasks', () => {
  const { spawnSync } = require('child_process');
  const path = require('path');
  const { findIbTask } = require('../../src/lib/ib-tasks');
  for (const key of ['incident', 'ssh']) {
    const out = spawnSync(
      'python3',
      ['-c', `import json, lab_task; print(json.dumps([s["title"] for s in lab_task.get("${key}").stages], ensure_ascii=False))`],
      { cwd: path.join(__dirname, '..', '..', 'ib', 'server'), encoding: 'utf-8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }
    );
    assert.strictEqual(out.status, 0, out.stderr);
    assert.deepStrictEqual(findIbTask(key).stages, JSON.parse(out.stdout), key);
  }
});

test('lab tasks №6 and №7 appear only once assigned, with theory before the terminal', async () => {
  const app = createApp();
  let agent = await loginAs(app, 'student-1');
  assert.strictEqual((await agent.get('/subjects/ib/ssh')).status, 404);

  db.seedLabTaskForTests('ssh', 'student-1', { passed: 2, total: 7, params: { port: 2222 } });
  db.seedLabTaskForTests('incident', 'student-1', { total: 8, params: { target: 'webops' } });
  agent = await loginAs(app, 'student-1');
  const subject = await agent.get('/subjects/ib');
  assert.match(subject.text, /Задание №6\. Расследование инцидента по журналам/);
  assert.match(subject.text, /Задание №7\. Безопасный удалённый доступ по SSH/);
  assert.match(subject.text, /выполнено этапов: 2 из 7/);

  const theory = await agent.get('/subjects/ib/ssh/theory');
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /Какое значение действует/);
  assert.match((await agent.get('/subjects/ib/incident/theory')).text, /Правила расследования/);
  assert.strictEqual((await agent.get('/subjects/ib/incident')).status, 200);
});

test('teacher sees lab task results and one student\'s stages and command log', async () => {
  db.seedLabTaskForTests('incident', 'student-1', {
    passed: 3,
    total: 8,
    params: { target: 'webops', attacker_ip: '203.0.113.45', attack_failed: 7, login_time: '02:51:07' },
    log: ['sudo grep Failed /var/log/auth.log'],
  });
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/admin/ib');
  assert.match(res.text, /Задание №6\. Расследование инцидента по журналам/);
  assert.match(res.text, /Задание №7\. Безопасный удалённый доступ по SSH/);
  assert.match(res.text, /4\. Успешный вход и действия после него/);
  assert.match(res.text, /webops · 203\.0\.113\.45 · 7 попыток · вход 02:51:07/);
  assert.match(res.text, /href="\/admin\/ib\/lab\/incident\/student-1"/);

  const detail = await agent.get('/admin/ib/lab/incident/student-1');
  assert.strictEqual(detail.status, 200);
  assert.match(detail.text, /Задание №6/);
  assert.match(detail.text, /8\. Отчёт об инциденте/);
  assert.match(detail.text, /\$ sudo grep Failed \/var\/log\/auth\.log/);
  assert.match(detail.text, /lab_check\.py --task incident student-1/);
  assert.strictEqual((await agent.get('/admin/ib/lab/ssh/student-1')).status, 404);
  assert.strictEqual((await agent.get('/admin/ib/lab/nope/student-1')).status, 404);
});
