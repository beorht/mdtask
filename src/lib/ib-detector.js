// Задание ИБ №8 «Расследование по журналам», этап 7: детектор атак на Python.
// Студент пишет программу на сайте (src/views/ib-detector.ejs, public/js/ib-detector.js); она
// выполняется в его браузере (python-worker.js) на каждом тесте, сервер сравнивает вывод с эталоном.
// Эталон — reference() ниже (тот же алгоритм, что в условии), тесты строятся по студенту (seed),
// поэтому готовые ответы соседа не подходят. Контрольный вопрос: после прохождения тестов студент
// предсказывает вывод своей программы на коротком журнале; ответ сверяется с эталоном.
const crypto = require('crypto');
const { normalize } = require('./python-basics-check');

const OPEN_TESTS = 2;
const BRUTE_MIN = 5; // POST /login с ответом 401 ...
const BRUTE_WINDOW = 60; // ... за любые 60 секунд
const SCAN_MIN = 8; // разных путей с ответом 404
const NONE = 'Атак не найдено';
const DEFENSE_SECONDS = 60;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PROXY = '10.10.0.2';

// --------------------------------------------------------------- эталон ---

const LINE_RE =
  /^(\S+) \S+ \S+ \[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) [+-]\d{4}\] "(\S+) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "[^"]*" "([^"]*)" rt=/;

function parseLine(line) {
  if (!line.includes(' rt=')) return null; // поддельная строка: нет полей, которые пишет nginx
  const m = LINE_RE.exec(line);
  if (!m) return null;
  const xff = m[11].trim();
  const client = xff && xff !== '-' ? xff.split(',').pop().trim() : m[1];
  const time = Date.UTC(+m[4], MONTHS.indexOf(m[3]), +m[2], +m[5], +m[6], +m[7]) / 1000;
  return { client, time, method: m[8], path: m[9].split('?')[0], status: +m[10] };
}

function ipKey(ip) {
  return ip.split('.').map((x) => x.padStart(3, '0')).join('.');
}

// lines: строки журнала (без первой строки с числом). Возвращает текст, который должна вывести программа.
function reference(lines) {
  const brute = new Map();
  const scan = new Map();
  for (const line of lines) {
    const r = parseLine(line);
    if (!r) continue;
    if (r.method === 'POST' && r.path === '/login' && r.status === 401) {
      if (!brute.has(r.client)) brute.set(r.client, []);
      brute.get(r.client).push(r.time);
    }
    if (r.status === 404) {
      if (!scan.has(r.client)) scan.set(r.client, new Set());
      scan.get(r.client).add(r.path);
    }
  }
  const found = [];
  for (const [ip, times] of brute) {
    const sorted = [...times].sort((a, b) => a - b);
    let hit = false;
    for (let i = 0; i + BRUTE_MIN - 1 < sorted.length; i += 1) {
      if (sorted[i + BRUTE_MIN - 1] - sorted[i] <= BRUTE_WINDOW) hit = true;
    }
    if (hit) found.push({ ip, kind: 0, text: `BRUTEFORCE ${ip} ${times.length}` });
  }
  for (const [ip, paths] of scan) {
    if (paths.size >= SCAN_MIN) found.push({ ip, kind: 1, text: `SCAN ${ip} ${paths.size}` });
  }
  found.sort((a, b) => ipKey(a.ip).localeCompare(ipKey(b.ip)) || a.kind - b.kind);
  return found.length ? found.map((f) => f.text).join('\n') : NONE;
}

// --------------------------------------------------------------- тесты ---

function rngFrom(seed) {
  let x = crypto.createHash('sha256').update(String(seed)).digest().readUInt32LE(0) || 1;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
  return {
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    shuffle: (list) => {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

function ts(epoch) {
  const d = new Date(epoch * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}:${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0500`;
}

function makeLog(rng) {
  const lines = [];
  let cid = rng.int(1000, 9000);
  const ip = () => `${rng.pick([31, 62, 77, 91, 185, 213])}.${rng.int(1, 254)}.${rng.int(1, 254)}.${rng.int(1, 254)}`;
  const add = (t, client, method, path, status, { xff, user = '-', fake = false } = {}) => {
    cid += rng.int(1, 4);
    const direct = client.startsWith('10.') && !xff;
    const remote = direct ? client : PROXY;
    const forwarded = xff || (direct ? '-' : client);
    const ua = rng.pick(['Mozilla/5.0 (X11; Linux x86_64) Firefox/132.0', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', 'curl/8.5.0']);
    let line = `${remote} - ${user} [${ts(t)}] "${method} ${path} HTTP/1.1" ${status} ${status === 200 ? rng.int(200, 9000) : 0} "-" "${ua}" "${forwarded}"`;
    if (!fake) line += ` rt=${(rng.int(1, 900) / 1000).toFixed(3)} cid=${cid}`;
    lines.push({ t, line });
  };
  const noise = (from, to, n) => {
    for (let k = 0; k < n; k += 1) {
      const t = rng.int(from, to);
      const r = rng.int(1, 10);
      if (r <= 6) add(t, ip(), 'GET', rng.pick(['/', '/catalog', '/static/app.js', `/product/${rng.int(1, 900)}`]), 200);
      else if (r <= 8) add(t, ip(), 'GET', `/old/${rng.int(1, 9)}`, 404);
      else add(t, ip(), 'POST', '/login', rng.pick([302, 401]));
    }
  };
  return { lines, add, noise, ip };
}

function finish(log) {
  const lines = log.lines.sort((a, b) => a.t - b.t).map((x) => x.line);
  return { lines, input: [String(lines.length), ...lines], output: reference(lines) };
}

const BASE = Date.UTC(2026, 10, 19, 1, 0, 0) / 1000; // 19 ноября 2026, 06:00 по +05 (время в строках — +0500)

// Восемь тестов студента: первые два открытые. Крайние случаи — в описании каждого.
function testsFor(studentId) {
  const tests = [];
  const make = (n, build) => {
    const rng = rngFrom(`${studentId}-detector-${n}`);
    const log = makeLog(rng);
    build(rng, log);
    tests.push(finish(log));
  };
  // 1. простой перебор паролей среди обычных запросов
  make(1, (rng, log) => {
    log.noise(BASE, BASE + 1800, 25);
    const a = log.ip();
    let t = BASE + rng.int(300, 900);
    for (let k = 0; k < rng.int(6, 9); k += 1) log.add((t += rng.int(2, 6)), a, 'POST', '/login', 401);
  });
  // 2. сканирование: 9+ разных несуществующих путей
  make(2, (rng, log) => {
    log.noise(BASE, BASE + 1800, 25);
    const a = log.ip();
    let t = BASE + rng.int(300, 900);
    for (const p of rng.shuffle(['/.env', '/admin.php', '/wp-login.php', '/backup.zip', '/.git/config', '/db.sql', '/phpmyadmin/', '/test.php', '/server-status']))
      log.add((t += rng.int(1, 3)), a, 'GET', p, 404);
  });
  // 3. пустой журнал
  make(3, () => {});
  // 4. порог: ровно 5 за 60 секунд — атака; 5 за 61+ секунду и 4 подряд — нет
  make(4, (rng, log) => {
    log.noise(BASE, BASE + 3600, 30);
    const a = log.ip();
    const b = log.ip();
    const c = log.ip();
    const t0 = BASE + 600;
    [0, 15, 30, 45, 60].forEach((d) => log.add(t0 + d, a, 'POST', '/login', 401));
    [0, 20, 40, 55, 61].forEach((d) => log.add(t0 + 900 + d, b, 'POST', '/login', 401));
    [0, 1, 2, 3].forEach((d) => log.add(t0 + 1500 + d, c, 'POST', '/login', 401));
  });
  // 5. X-Forwarded-For: атакующий подставляет ложный адрес первым, настоящий — последний
  make(5, (rng, log) => {
    log.noise(BASE, BASE + 1800, 20);
    const real = log.ip();
    const spoof = log.ip();
    let t = BASE + 400;
    for (let k = 0; k < 7; k += 1) log.add((t += rng.int(2, 7)), real, 'POST', '/login', 401, { xff: `${spoof}, ${real}` });
    log.add(t + 100, spoof, 'POST', '/login', 401);
  });
  // 6. поддельные строки без rt= и cid= не считаются
  make(6, (rng, log) => {
    log.noise(BASE, BASE + 1800, 20);
    const framed = `10.20.0.${rng.int(11, 240)}`;
    let t = BASE + 500;
    for (let k = 0; k < 8; k += 1) log.add((t += 1), framed, 'POST', '/login', 401, { fake: true });
    for (let k = 0; k < 10; k += 1) log.add((t += 1), framed, 'GET', `/secret${k}`, 404, { fake: true });
  });
  // 7. перебор через полночь (время в строках с датой)
  make(7, (rng, log) => {
    const mid = Date.UTC(2026, 10, 19, 19, 0, 0) / 1000; // 00:00 20 ноября по +05
    log.noise(mid - 1800, mid + 1800, 25);
    const a = log.ip();
    [-40, -25, -10, 5, 15, 20].forEach((d) => log.add(mid + d, a, 'POST', '/login', 401));
  });
  // 8. оба типа с одного адреса; повтор пути и разные параметры ?x= не дают новых путей; 7 путей — не скан
  make(8, (rng, log) => {
    log.noise(BASE, BASE + 3600, 30);
    const a = log.ip();
    const b = log.ip();
    let t = BASE + 1000;
    for (let k = 0; k < 6; k += 1) log.add((t += 3), a, 'POST', '/login', 401);
    ['/a', '/a', '/b?x=1', '/b?x=2', '/c', '/d', '/e', '/f', '/g', '/h'].forEach((p) => log.add((t += 2), a, 'GET', p, 404));
    ['/1', '/2', '/3', '/4', '/5', '/6', '/7', '/7?v=2'].forEach((p) => log.add((t += 2), b, 'GET', p, 404));
  });
  return tests;
}

// Как страница отдаёт тесты браузеру: вход у всех, ожидаемый вывод только у открытых.
function publicTests(studentId) {
  return testsFor(studentId).map((t, i) => ({ input: t.input, ...(i < OPEN_TESTS ? { output: t.output } : {}) }));
}

// runs: [{ stdout, error, timeout }] по порядку тестов.
function checkRuns(studentId, runs) {
  const tests = testsFor(studentId);
  if (!Array.isArray(runs) || runs.length !== tests.length) throw new Error(`Нужно ${tests.length} результатов запуска.`);
  const results = tests.map((t, i) => {
    const r = runs[i] || {};
    const error = r.timeout ? 'превышено время' : r.error ? String(r.error).slice(0, 300) : null;
    const passed = !error && normalize(String(r.stdout || '').slice(0, 20000)) === normalize(t.output);
    return { number: i + 1, open: i < OPEN_TESTS, passed, error, ...(i < OPEN_TESTS ? { expected: t.output, actual: String(r.stdout || '').slice(0, 3000) } : {}) };
  });
  const passed = results.filter((r) => r.passed).length;
  return { results, passed, total: tests.length, solved: passed === tests.length };
}

// ------------------------------------------------------- контрольный вопрос ---

// Короткий журнал с подвохом (каждый раз новый): студент должен сказать, что выведет его программа.
function challenge() {
  const rng = rngFrom(crypto.randomBytes(8).toString('hex'));
  const log = makeLog(rng);
  const a = log.ip();
  const b = log.ip();
  let t = BASE + rng.int(100, 900);
  const variant = rng.int(1, 3);
  if (variant === 1) {
    // 5 ошибок с одного адреса, но одна из них — поддельная строка
    for (let k = 0; k < 5; k += 1) log.add((t += 5), a, 'POST', '/login', 401, { fake: k === 2 });
    log.add((t += 3), b, 'GET', '/', 200);
  } else if (variant === 2) {
    // через прокси: настоящий адрес — последний в X-Forwarded-For
    for (let k = 0; k < 5; k += 1) log.add((t += 4), b, 'POST', '/login', 401, { xff: `${a}, ${b}` });
    log.add((t += 2), a, 'GET', '/', 200);
  } else {
    // 5 попыток, но растянуты на 61 секунду
    [0, 20, 40, 50, 61].forEach((d) => log.add(t + d, a, 'POST', '/login', 401));
    log.add(t + 70, b, 'POST', '/login', 302);
  }
  const done = finish(log);
  return { input: done.input, expected: done.output, issuedAt: Date.now() };
}

function checkDefense(issued, answer, now = Date.now()) {
  const late = now - issued.issuedAt > (DEFENSE_SECONDS + 5) * 1000;
  return { ok: !late && normalize(answer) === normalize(issued.expected), late, expected: issued.expected };
}

module.exports = {
  OPEN_TESTS,
  BRUTE_MIN,
  BRUTE_WINDOW,
  SCAN_MIN,
  NONE,
  DEFENSE_SECONDS,
  reference,
  testsFor,
  publicTests,
  checkRuns,
  challenge,
  checkDefense,
};
