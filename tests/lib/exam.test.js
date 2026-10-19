const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const exam = require('../../src/lib/exam');
const { buildScenario, caesar } = require('../../src/lib/exam/scenario');
const { SPECS, algorithmTask, algorithmRefs } = require('../../src/lib/exam/algorithms');
const { bugRefs, bugTask } = require('../../src/lib/exam/bugs');
const sql = require('../../src/lib/exam/sql');
const { normalize } = require('../../src/lib/python-basics-check');

const ROOT = path.join(__dirname, '..', '..');
const THEMES = ['shop', 'library', 'clinic'];

test('18 students of the group get 18 different combinations of theme, algorithms and wording', () => {
  const combos = new Set();
  for (let i = 0; i < 18; i += 1) {
    const v = exam.variantForIndex(i);
    combos.add(`${v.theme}/${v.algorithms.map((a) => a.algo + a.form).join('+')}`);
    assert.strictEqual(v.bugs.length, 5);
    assert.deepStrictEqual(v.bugs.map((b) => b[0]), ['1', '2', '3', '4', '5']);
  }
  assert.strictEqual(combos.size, 18);
  assert.deepStrictEqual(algorithmRefs(0).map((r) => r.algo), ['linear', 'selection']);
  assert.deepStrictEqual(new Set(bugRefs(0)).size, 5);
});

test('every task of a variant: stages, ids and points add up to 100', () => {
  for (let i = 0; i < 3; i += 1) {
    const v = { ...exam.variantForIndex(i), seed: `seed-${i}` };
    const tasks = exam.tasksOf(v);
    assert.deepStrictEqual(
      tasks.map((t) => t.id),
      ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '4.1', '4.2', '4.3', '4.4', '5.1', '5.2', '6.1']
    );
    assert.strictEqual(tasks.reduce((s, t) => s + t.points, 0), 100);
  }
});

test('scenario: the flag answers follow from the files of the sandbox', () => {
  for (const theme of THEMES) {
    for (const seed of ['a', 'b', 'c']) {
      const s = buildScenario(seed, theme);
      const file = (p) => s.files.find((f) => f.path === p);
      const service = s.files.find((f) => f.path.startsWith('etc/systemd/system/'));
      assert.ok(service.content.includes(`--config ${s.answers['1.1']}`));
      const config = file(s.answers['1.1'].slice(1));
      assert.match(config.content, new RegExp(`port = ${s.answers['1.2']}\\n`));
      assert.match(config.content, new RegExp(`path = ${s.answers['1.3']}\\n`));
      assert.strictEqual(s.databases[0].path, s.answers['1.3'].slice(1));
      assert.strictEqual(s.databases[0].mode, s.answers['1.4']);
      const log = file(`var/log/${s.params.app}/access.log`).content.split('\n').filter(Boolean);
      const attacker = s.answers['2.1'];
      const fails = log.filter((l) => l.includes(` ${attacker} LOGIN_FAIL `));
      assert.strictEqual(String(fails.length), s.answers['2.3']);
      const ok = log.filter((l) => l.includes(` ${attacker} LOGIN_OK ${s.params.attacker}`));
      assert.strictEqual(ok.length, 1);
      assert.strictEqual(ok[0].slice(11, 19), s.answers['2.2']);
      // Lines are in time order, and only the attacker's address logs in after a series of failures.
      assert.deepStrictEqual(log.map((l) => l.slice(0, 19)), log.map((l) => l.slice(0, 19)).sort());
      const key = s.files.find((f) => f.path === `home/{user}/${s.caesar.keyFile.slice(2)}`);
      assert.ok(key.content.includes(s.caesar.cipher));
      assert.strictEqual(caesar(s.caesar.cipher, 26 - s.caesar.shift), s.answers['5.1']);
      assert.ok(s.protectedDb.sql.includes(s.answers['5.2']));
    }
  }
});

test('flag answers: paths, numbers, modes and times are compared leniently', () => {
  const n = exam.normalizeFlag;
  assert.strictEqual(n('path', ' "/etc/app/app.conf/" '), '/etc/app/app.conf');
  assert.strictEqual(n('mode', '0640'), '640');
  assert.strictEqual(n('time', '2026-11-19 2:14:07'), '02:14:07');
  assert.strictEqual(n('text', 'Falcon123'), n('text', 'falcon123'));
  assert.strictEqual(n('number', '007'), '7');
});

test('SQL tasks: the reference solutions pass, restoring the whole table from the backup does not', () => {
  for (const theme of THEMES) {
    const s = buildScenario(`sql-${theme}`, theme);
    const tasks = sql.tasksFor(s.params);
    for (const task of tasks) {
      const r = sql.runSql(task, s.schemaSql, task.solution, { check: true });
      assert.ok(r.success && r.isCorrect, `${theme} ${task.id}: ${r.error || r.notice}`);
    }
    const main = s.params.sql.main;
    const value = s.params.sql.value;
    const lazy = `UPDATE ${main} SET ${value} = (SELECT b.${value} FROM ${main}_backup b WHERE b.id = ${main}.id) WHERE id IN (SELECT id FROM ${main}_backup)`;
    assert.strictEqual(sql.runSql(tasks[2], s.schemaSql, lazy, { check: true }).isCorrect, false);
    assert.strictEqual(sql.runSql(tasks[3], s.schemaSql, 'UPDATE staff SET active = 0', { check: true }).isCorrect, false);
    const noJoin = `SELECT record_id, action FROM audit_log WHERE login = '${s.params.attacker}'`;
    assert.match(sql.runSql(tasks[0], s.schemaSql, noJoin, { check: true }).notice, /JOIN/);
  }
});

test('algorithms: Python reference solutions print exactly the expected output of every test', () => {
  for (const theme of THEMES) {
    for (const algo of ['linear', 'selection', 'bubble']) {
      for (const form of ['a', 'b']) {
        const task = algorithmTask(theme, { algo, form }, 'test-seed', 1);
        const spec = SPECS[theme][algo][form];
        const arg = algo === 'linear' ? spec.kind : spec.order;
        assert.strictEqual(task.tests.length, 6);
        for (const t of task.tests) {
          const r = spawnSync('python3', ['-I', path.join(ROOT, 'scripts', 'exam', 'solutions', 'algorithms', `${algo}.py`), arg], {
            input: t.input.join('\n') + '\n',
            encoding: 'utf-8',
          });
          assert.strictEqual(normalize(r.stdout), normalize(t.output), `${theme} ${algo} ${form}`);
        }
      }
    }
  }
});

test('algorithms: the statements give no code and the counters tell the algorithms apart', () => {
  const sel = algorithmTask('shop', { algo: 'selection', form: 'a' }, 's', 1);
  const bub = algorithmTask('shop', { algo: 'bubble', form: 'a' }, 's', 2);
  for (const t of [sel, bub]) assert.ok(!/```|def |for .* in range/.test(t.statement));
  assert.match(sel.tests[0].output, /Обменов: \d+$/);
  assert.match(bub.tests[0].output, /Проходов: \d+$/);
});

test('forbidden functions are found by parsing, the reference solutions have none', () => {
  const check = (code) => JSON.parse(spawnSync('python3', ['-I', path.join(ROOT, 'src', 'lib', 'exam', 'forbidden.py')], { input: code, encoding: 'utf-8' }).stdout);
  const found = check('a = [3, 1]\nprint(sorted(a))\nif 3 in a:\n    a.sort()\nimport heapq\nfor x in a:\n    print(x)\n').found;
  assert.deepStrictEqual(found.map((f) => f.replace(/ \(строка \d+\)/, '')), ['sorted()', 'проверка «x in …»', '.sort()', 'модуль heapq']);
  for (const name of ['linear', 'selection', 'bubble']) {
    const code = require('fs').readFileSync(path.join(ROOT, 'scripts', 'exam', 'solutions', 'algorithms', `${name}.py`), 'utf-8');
    assert.deepStrictEqual(check(code).found, []);
  }
  assert.ok(check('def f(:\n').syntax);
});

test('bug programs: built from the references, 30–70 lines, wrong on the example', () => {
  const r = spawnSync('python3', [path.join(ROOT, 'scripts', 'exam', 'build-bugs.py'), '--check'], { encoding: 'utf-8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  for (const theme of THEMES) {
    for (const short of ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b']) {
      const t = bugTask(theme, short, 3);
      const lines = t.starter.trimEnd().split('\n').length;
      assert.ok(lines >= 30 && lines <= 70, `${t.program}: ${lines}`);
      assert.strictEqual(t.tests.length, 5);
      assert.ok(t.tests.every((x) => typeof x.output === 'string'));
      assert.ok(!/\*\*/.test(t.description), `${t.program}: описание не должно подсвечивать ошибку`);
    }
  }
});

test('scenario generation never fails: many seeds per theme, every SQL reference passes, the attack is there', () => {
  for (const theme of THEMES) {
    for (let i = 0; i < 60; i += 1) {
      const s = buildScenario(`ib-final-1:st-${i}:${(i * 7919).toString(16)}`, theme);
      const log = s.files.find((f) => f.path.endsWith('access.log')).content;
      const night = log.split(`LOGIN_OK ${s.params.attacker}`).pop();
      assert.match(night, / UPDATE /);
      assert.match(night, / DELETE /);
      for (const t of sql.tasksFor(s.params)) assert.ok(sql.runSql(t, s.schemaSql, t.solution, { check: true }).isCorrect, `${theme} ${i} ${t.id}`);
    }
  }
});

test('devices: a PC is recognised by IP, a different MAC behind its IP is not; the PC list is imported read-only', () => {
  const fs = require('fs');
  const os = require('os');
  const Database = require('better-sqlite3');
  const db = require('../../src/db');
  const devices = require('../../src/lib/exam/devices');
  db.__resetForTests();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-pcs-'));
  const file = path.join(dir, 'pcs.sqlite');
  const src = new Database(file);
  src.exec("CREATE TABLE ib_pc (id INTEGER PRIMARY KEY, mac_address TEXT, pc_name TEXT, ip_address TEXT); INSERT INTO ib_pc (mac_address, pc_name, ip_address) VALUES ('F4:B5:20:66:F6:60', 'pc-414-01', '192.168.100.215'), ('aa:bb', '', 'x');");
  src.close();
  const r = devices.importPcs(file);
  assert.deepStrictEqual([r.saved, r.total], [1, 2]);
  assert.deepStrictEqual(db.getExamPcs().map((p) => [p.name, p.ip, p.mac, p.room]), [['pc-414-01', '192.168.100.215', 'f4:b5:20:66:f6:60', '414']]);

  const student = { role: 'student', group: 'IB' };
  const win = { deviceMode: 'block' };
  assert.strictEqual(devices.checkDevice(win, {}, student, '::ffff:192.168.100.215').allowed, true);
  assert.strictEqual(devices.checkDevice(win, {}, student, '10.0.0.5').allowed, false);
  assert.strictEqual(devices.checkDevice({ deviceMode: 'warn' }, {}, student, '10.0.0.5').allowed, true);
  assert.strictEqual(devices.checkDevice(win, { anyDevice: true }, student, '10.0.0.5').reason, 'any_device');
  assert.strictEqual(devices.checkDevice(win, {}, { role: 'student', group: 'TEST' }, '10.0.0.5').reason, 'test');

  const arp = path.join(dir, 'arp');
  fs.writeFileSync(arp, 'IP address       HW type     Flags       HW address            Mask     Device\n192.168.100.215  0x1         0x2         aa:aa:aa:aa:aa:aa     *        eth0\n');
  process.env.EXAM_ARP_FILE = arp;
  delete require.cache[require.resolve('../../src/lib/exam/devices')];
  const fresh = require('../../src/lib/exam/devices');
  const c = fresh.checkDevice(win, {}, student, '192.168.100.215');
  assert.deepStrictEqual([c.allowed, c.reason, c.mac], [false, 'mac_mismatch', 'aa:aa:aa:aa:aa:aa']);
  delete process.env.EXAM_ARP_FILE;
  fs.rmSync(dir, { recursive: true, force: true });
  db.__resetForTests();
});
