// The story of one student's variant of the IB final exam: the server (service config,
// database file), the night attack in the application log, the database the SQL stage works
// on and the Caesar-encrypted backup password. Everything is derived from the variant's seed,
// so it can be rebuilt at any time; buildScenario() returns what the pages show (`params`),
// the expected flag answers (`answers`, server only) and the files of the terminal sandbox.
const { THEMES } = require('./themes');
const { createRng } = require('./rng');

const PEOPLE = [
  'Абдуллаев Шерзод', 'Белова Марина', 'Васильев Игорь', 'Гафурова Лола', 'Давыдов Артур',
  'Ершова Нина', 'Жуков Роман', 'Зайцева Ксения', 'Исмаилов Фарход', 'Королева Дина',
  'Литвинов Сергей', 'Мухаммадиев Акмал', 'Никитина Алла', 'Осипов Глеб', 'Пак Виктория',
  'Рахимов Улугбек', 'Степанова Яна', 'Турсунов Бобур', 'Умарова Севара', 'Федоров Максим',
  'Хасанова Дилноза', 'Цой Эдуард', 'Шарипов Азиз', 'Юлдашева Мадина',
];
const CITIES = ['Ташкент', 'Самарканд', 'Бухара', 'Наманган', 'Андижан', 'Фергана', 'Нукус'];
const DISTRICTS = ['Юнусабадский', 'Чиланзарский', 'Мирзо-Улугбекский', 'Яккасарайский', 'Сергелийский', 'Алмазарский'];
const PRODUCTS = [
  ['Ноутбук Vega 15', 'Компьютеры', 7200000], ['Монитор 27"', 'Компьютеры', 2900000],
  ['Клавиатура K100', 'Аксессуары', 350000], ['Мышь беспроводная', 'Аксессуары', 180000],
  ['Смартфон Nova 8', 'Телефоны', 3400000], ['Наушники Bass', 'Аудио', 640000],
  ['Колонка Mini', 'Аудио', 520000], ['Роутер AX3000', 'Сеть', 890000],
  ['Принтер LaserJet', 'Офис', 2300000], ['Флешка 64 ГБ', 'Аксессуары', 95000],
  ['Планшет Tab 10', 'Телефоны', 2600000], ['Веб-камера HD', 'Аксессуары', 410000],
];
const BOOKS = [
  ['Мастер и Маргарита', 'Булгаков М.'], ['Минувшие дни', 'Кадыри А.'], ['Преступление и наказание', 'Достоевский Ф.'],
  ['Война и мир', 'Толстой Л.'], ['Алхимик', 'Коэльо П.'], ['1984', 'Оруэлл Дж.'], ['Шум и ярость', 'Фолкнер У.'],
  ['Звёздный странник', 'Лондон Дж.'], ['Белый пароход', 'Айтматов Ч.'], ['Мёртвые души', 'Гоголь Н.'],
  ['Отцы и дети', 'Тургенев И.'], ['Евгений Онегин', 'Пушкин А.'],
];
const DOCTORS = [
  ['Каримова Н.', 'терапевт', 120000], ['Ли С.', 'кардиолог', 250000], ['Орлов В.', 'невролог', 220000],
  ['Хамидова Г.', 'офтальмолог', 180000], ['Сафаров Б.', 'хирург', 260000], ['Миронова Е.', 'эндокринолог', 230000],
  ['Юсупов Д.', 'лор', 160000], ['Ким А.', 'дерматолог', 190000],
];
const PASSWORD_WORDS = [
  'Falcon', 'Compass', 'Ember', 'Granite', 'Harbor', 'Juniper', 'Lantern', 'Meridian', 'Nebula', 'Orchid',
  'Quartz', 'Ridge', 'Sable', 'Thicket', 'Willow', 'Zephyr', 'Basalt', 'Cobalt', 'Glacier', 'Horizon',
  'Mosaic', 'Pioneer', 'Summit', 'Voyager',
];
const SCAN_USERS = ['admin', 'root', 'test', 'user', 'guest', 'oracle', 'backup', 'support', 'ftp', 'deploy', 'web', 'postgres'];

// Where the hidden key file can be (directory -> file names); the others get look-alike decoys.
const HIDDEN_DIRS = {
  '.config/.sync': ['.state', '.token.bak', '.queue'],
  '.local/share/.trash-info': ['.index', '.meta.old'],
  '.cache/.thumbs': ['.db.lock', '.cache-key'],
  '.ssh/.archive': ['.known.old', '.cfg.bak'],
  '.backup': ['.keyfile', '.last-run'],
  '.local/state/.session': ['.recent', '.restore'],
};

// Story time: seconds from 2026-11-18 00:00 on the server's clock.
const DAY0 = Date.UTC(2026, 10, 18);
const H = 3600;
const NIGHT_FROM = '2026-11-19 00:00:00';
const BACKUP_AT = 23 * H + 30 * 60;

function pad(n) {
  return String(n).padStart(2, '0');
}

function stamp(sec) {
  const d = new Date(DAY0 + sec * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function caesar(text, shift) {
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26) + base);
  });
}

function quote(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertSql(table, rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return rows.map((r) => `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => quote(r[c])).join(', ')});`).join('\n');
}

// ------------------------------------------------------------------- database ---

function buildDatabase(theme, rng, attacker, staff) {
  const sql = theme.sql;
  const personCount = rng.int(8, 10);
  const people = rng.sample(PEOPLE, personCount).map((name, i) => ({
    id: i + 1,
    name,
    [theme.key === 'shop' ? 'city' : 'district']: rng.pick(theme.key === 'shop' ? CITIES : DISTRICTS),
  }));

  let items;
  if (theme.key === 'shop') {
    items = rng.sample(PRODUCTS, 8).map(([title, category, price], i) => ({ id: i + 1, title, category, price }));
  } else if (theme.key === 'library') {
    items = rng.sample(BOOKS, 9).map(([title, author], i) => ({ id: i + 1, title, author }));
  } else {
    items = rng.sample(DOCTORS, 6).map(([name, specialty, price], i) => ({ id: i + 1, name, specialty, price }));
  }

  const firstId = rng.int(10, 60) * 100 + 1;
  const count = rng.int(34, 42);
  const rows = [];
  for (let k = 0; k < count; k += 1) {
    const person = rng.pick(people);
    const item = rng.pick(items);
    const day = rng.int(1, 17);
    const id = firstId + k;
    if (theme.key === 'shop') {
      const qty = rng.int(1, 3);
      rows.push({ id, customer_id: person.id, product_id: item.id, qty, amount: item.price * qty, created_at: `2026-11-${pad(day)}` });
    } else if (theme.key === 'library') {
      const overdue = rng.next() < 0.55;
      rows.push({
        id,
        reader_id: person.id,
        book_id: item.id,
        issued_at: `2026-10-${pad(rng.int(1, 30))}`,
        due_at: `2026-11-${pad(day)}`,
        fine: overdue ? rng.int(2, 40) * 1000 : 0,
      });
    } else {
      rows.push({
        id,
        patient_id: person.id,
        doctor_id: item.id,
        visit_at: `2026-11-${pad(day)} ${pad(rng.int(8, 17))}:${pick30(rng)}`,
        price: item.price,
        status: rng.pick(['оплачен', 'оплачен', 'ожидает оплаты']),
      });
    }
  }

  const value = sql.value;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const audit = [];
  const log = (login, action, recordId, oldValue, newValue, at) =>
    audit.push({ login, action, record_id: recordId, old_value: oldValue, new_value: newValue, at: stamp(at) });
  const others = staff.filter(([login]) => login !== attacker);

  // 18 November, working day: ordinary corrections, some of them by the future victim account.
  const touched = new Set();
  const dayEdits = rng.int(5, 7);
  const dayTimes = rng.distinct(dayEdits, 9 * 60, 17 * 60 + 50).sort((a, b) => a - b);
  dayTimes.forEach((minute, i) => {
    const row = rng.pick(rows.filter((r) => !touched.has(r.id) && r[value] > 0));
    touched.add(row.id);
    const login = i < 2 ? attacker : rng.pick(others)[0];
    const old = row[value];
    const next = theme.key === 'library' ? 0 : Math.round((old * 0.9) / 1000) * 1000;
    row[value] = next;
    log(login, 'UPDATE', row.id, old, next, minute * 60 + rng.int(0, 59));
  });

  const backup = rows.map((r) => ({ ...r }));

  // Night of 19 November: the attack.
  const candidates = rng.shuffle(rows.filter((r) => !touched.has(r.id) && r[value] > 0));
  const updated = candidates.slice(0, rng.int(3, 5));
  const deleted = candidates.slice(updated.length, updated.length + rng.int(2, 4));
  const lowered = theme.key === 'shop' ? 1 : 0;

  // Morning of 19 November: honest staff keep working after the attack.
  const morningRows = rng.shuffle(rows.filter((r) => !touched.has(r.id) && !updated.includes(r) && !deleted.includes(r))).slice(0, 2);
  const lastId = firstId + count - 1;

  return {
    people,
    items,
    rows,
    backup,
    byId,
    audit,
    log,
    updated,
    deleted,
    lowered,
    morningRows,
    newIds: [lastId + 1, lastId + 2],
    value,
  };
}

function pick30(rng) {
  return rng.pick(['00', '15', '30', '45']);
}

function newRowLike(theme, rng, id, people, items) {
  const person = rng.pick(people);
  const item = rng.pick(items);
  if (theme.key === 'shop') return { id, customer_id: person.id, product_id: item.id, qty: 1, amount: item.price, created_at: '2026-11-19' };
  if (theme.key === 'library') return { id, reader_id: person.id, book_id: item.id, issued_at: '2026-11-19', due_at: '2026-12-03', fine: 0 };
  return { id, patient_id: person.id, doctor_id: item.id, visit_at: '2026-11-19 10:00', price: item.price, status: 'ожидает оплаты' };
}

function schemaSql(theme, db, staffRows) {
  const sql = theme.sql;
  const personCol = theme.key === 'shop' ? 'city' : 'district';
  let itemsDdl;
  let mainCols;
  if (theme.key === 'shop') {
    itemsDdl = 'CREATE TABLE products (id INTEGER PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL);';
    mainCols = 'id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL{fk1}, product_id INTEGER NOT NULL{fk2}, qty INTEGER NOT NULL, amount INTEGER NOT NULL, created_at TEXT NOT NULL';
  } else if (theme.key === 'library') {
    itemsDdl = 'CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL);';
    mainCols = 'id INTEGER PRIMARY KEY, reader_id INTEGER NOT NULL{fk1}, book_id INTEGER NOT NULL{fk2}, issued_at TEXT NOT NULL, due_at TEXT NOT NULL, fine INTEGER NOT NULL';
  } else {
    itemsDdl = 'CREATE TABLE doctors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL, price INTEGER NOT NULL);';
    mainCols = 'id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL{fk1}, doctor_id INTEGER NOT NULL{fk2}, visit_at TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL';
  }
  const withFk = mainCols
    .replace('{fk1}', ` REFERENCES ${sql.person.table}(id)`)
    .replace('{fk2}', ` REFERENCES ${sql.item.table}(id)`);
  const noFk = mainCols.replace('{fk1}', '').replace('{fk2}', '');
  return [
    `CREATE TABLE ${sql.person.table} (id INTEGER PRIMARY KEY, name TEXT NOT NULL, ${personCol} TEXT NOT NULL);`,
    itemsDdl,
    `CREATE TABLE ${sql.main} (${withFk});`,
    `-- Резервная копия таблицы ${sql.main}, снята ${stamp(BACKUP_AT)}`,
    `CREATE TABLE ${sql.main}_backup (${noFk});`,
    'CREATE TABLE staff (login TEXT PRIMARY KEY, full_name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);',
    'CREATE TABLE audit_log (id INTEGER PRIMARY KEY, login TEXT NOT NULL, action TEXT NOT NULL, record_id INTEGER NOT NULL, old_value INTEGER, new_value INTEGER, at TEXT NOT NULL);',
    insertSql(sql.person.table, db.people),
    insertSql(sql.item.table, db.items),
    insertSql(sql.main, db.rows),
    insertSql(`${sql.main}_backup`, db.backup),
    insertSql('staff', staffRows),
    insertSql('audit_log', db.audit.map((a, i) => ({ id: i + 1, ...a }))),
  ].join('\n');
}

// --------------------------------------------------------------- access log ---

function ipIn(rng, prefix) {
  return `${prefix}.${rng.int(11, 249)}`;
}

function buildAccessLog(theme, rng, db, attacker, staff, ips) {
  const events = []; // [sec, text]
  const add = (sec, ip, action, login, details) => events.push([sec, `${ip} ${action} ${login}${details ? ' ' + details : ''}`]);
  const main = theme.sql.main;
  const value = db.value;
  const staffIp = Object.fromEntries(staff.map(([login], i) => [login, `10.10.${rng.int(1, 9)}.${20 + i * 7}`]));

  // Working day: every account logs in, looks at records, logs out; the day's corrections.
  const dayEdits = db.audit.filter((a) => a.at < NIGHT_FROM);
  const editsBy = {};
  dayEdits.forEach((a) => (editsBy[a.login] = editsBy[a.login] || []).push(a));
  const typoLogin = rng.pick(staff.filter(([l]) => l !== attacker))[0];
  staff.forEach(([login]) => {
    const firstEdit = Math.min(...(editsBy[login] || []).map((a) => toSec(a.at)), Infinity);
    const start = Math.min(rng.int(8 * 60 + 30, 10 * 60) * 60 + rng.int(0, 59), firstEdit - rng.int(120, 900));
    if (login === typoLogin) add(start - rng.int(5, 20), staffIp[login], 'LOGIN_FAIL', login);
    add(start, staffIp[login], 'LOGIN_OK', login);
    let t = start;
    for (let v = rng.int(4, 9); v > 0; v -= 1) {
      t += rng.int(60, 1500);
      add(t, staffIp[login], 'VIEW', login, `${main} id=${rng.pick(db.rows).id}`);
    }
    (editsBy[login] || []).forEach((a) => {
      const sec = toSec(a.at);
      add(sec, staffIp[login], 'UPDATE', login, `${main} id=${a.record_id} ${value} ${a.old_value}->${a.new_value}`);
      t = Math.max(t, sec);
    });
    add(Math.max(t + rng.int(300, 2400), 17 * H + rng.int(0, 3000)), staffIp[login], 'LOGOUT', login);
  });

  // Evening: a scanner tries common account names, never gets in.
  let t = 22 * H + rng.int(0, 50) * 60;
  rng.sample(SCAN_USERS, rng.int(7, 11)).forEach((name) => {
    t += rng.int(2, 40);
    add(t, ips.scanner, 'LOGIN_FAIL', name);
  });

  // Night: password guessing against the victim account, then the login and the damage.
  t = 86400 + 2 * H + rng.int(5, 40) * 60 + rng.int(0, 59);
  for (let k = 0; k < ips.fails; k += 1) {
    t += rng.int(2, 9);
    add(t, ips.attacker, 'LOGIN_FAIL', attacker);
  }
  t += rng.int(3, 12);
  const loginSec = t;
  add(t, ips.attacker, 'LOGIN_OK', attacker);
  for (let v = rng.int(2, 3); v > 0; v -= 1) {
    t += rng.int(15, 90);
    add(t, ips.attacker, 'VIEW', attacker, `${main} id=${rng.pick(db.rows).id}`);
  }
  const actions = rng.shuffle([...db.updated.map((r) => ['UPDATE', r]), ...db.deleted.map((r) => ['DELETE', r])]);
  actions.forEach(([action, row]) => {
    t += rng.int(20, 120);
    if (action === 'UPDATE') {
      const old = row[value];
      row[value] = db.lowered;
      db.log(attacker, 'UPDATE', row.id, old, db.lowered, t);
      add(t, ips.attacker, 'UPDATE', attacker, `${main} id=${row.id} ${value} ${old}->${db.lowered}`);
    } else {
      db.log(attacker, 'DELETE', row.id, row[value], null, t);
      add(t, ips.attacker, 'DELETE', attacker, `${main} id=${row.id}`);
    }
  });
  t += rng.int(30, 120);
  add(t, ips.attacker, 'EXPORT', attacker, theme.sql.person.table);
  t += rng.int(20, 90);
  add(t, ips.attacker, 'LOGOUT', attacker);
  db.rows = db.rows.filter((r) => !db.deleted.includes(r));

  // Morning: honest staff before anyone noticed.
  const morning = rng.sample(staff.filter(([l]) => l !== attacker), 2).map(([l]) => l);
  t = 86400 + 8 * H + 20 * 60 + rng.int(0, 600);
  morning.forEach((login, i) => {
    add(t, staffIp[login], 'LOGIN_OK', login);
    t += rng.int(60, 400);
    const row = db.morningRows[i];
    const old = row[value];
    const next = theme.key === 'library' ? old + 5000 : old + 10000;
    row[value] = next;
    db.log(login, 'UPDATE', row.id, old, next, t);
    add(t, staffIp[login], 'UPDATE', login, `${main} id=${row.id} ${value} ${old}->${next}`);
    t += rng.int(60, 400);
    const fresh = newRowLike(theme, rng, db.newIds[i], db.people, db.items);
    db.rows.push(fresh);
    db.log(login, 'INSERT', fresh.id, null, fresh[value], t);
    add(t, staffIp[login], 'INSERT', login, `${main} id=${fresh.id}`);
    t += rng.int(120, 900);
  });

  events.sort((a, b) => a[0] - b[0]);
  db.audit.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { lines: events.map(([sec, text]) => `${stamp(sec)} ${text}`), loginTime: stamp(loginSec).slice(11) };
}

function toSec(at) {
  return (Date.parse(at.replace(' ', 'T') + 'Z') - DAY0) / 1000;
}

// ---------------------------------------------------------------- the server ---

const CONFIG_PLACES = [
  (app) => `etc/${app}/${app}.conf`,
  (app) => `etc/${app}/conf.d/main.conf`,
  (app) => `opt/${app}/etc/${app}.conf`,
  (app) => `etc/opt/${app}/server.conf`,
];
const DB_PLACES = [
  (app, theme) => `srv/${app}/data/${theme.key}.db`,
  (app) => `var/lib/${app}/${app}.db`,
  (app) => `srv/${app}/db/main.db`,
];
const DB_MODES = ['640', '600', '660', '644'];

function configText(theme, port, dbPath, current) {
  return [
    `# Конфигурация службы ${theme.app} — ${theme.service}`,
    current ? '# Действующая конфигурация' : '# УСТАРЕВШАЯ конфигурация (до переезда на новый сервер), служба её не читает',
    '',
    '[server]',
    'listen = 0.0.0.0',
    `port = ${port}`,
    'workers = 4',
    '',
    '[database]',
    `path = /${dbPath}`,
    `backup_dir = /var/backups/${theme.app}`,
    '',
    '[log]',
    `access_log = /var/log/${theme.app}/access.log`,
    'level = info',
    '',
  ].join('\n');
}

function buildScenario(seed, themeKey) {
  const theme = THEMES[themeKey];
  const rng = createRng(seed);
  const app = theme.app;
  const staff = theme.staff;
  const attacker = rng.fork('attacker').pick(staff)[0];

  // --- stage 1: service, config, database file ---
  const srv = rng.fork('server');
  const configRel = srv.pick(CONFIG_PLACES)(app);
  const dbRel = srv.pick(DB_PLACES)(app, theme);
  const port = srv.int(8100, 8999);
  const oldPort = port + srv.pick([-37, 52, 101, -110]);
  const dbMode = srv.pick(DB_MODES);

  // --- stages 2 and 4: the attack ---
  const net = rng.fork('net');
  const prefixes = net.shuffle(['203.0.113', '198.51.100', '192.0.2']);
  const ips = { attacker: ipIn(net, prefixes[0]), scanner: ipIn(net, prefixes[1]), fails: net.int(9, 19) };
  const data = rng.fork('data');
  const db = buildDatabase(theme, data, attacker, staff);
  const access = buildAccessLog(theme, data, db, attacker, staff, ips);
  const staffRows = staff.map(([login, fullName]) => ({ login, full_name: fullName, active: 1 }));
  const schema = schemaSql(theme, db, staffRows);

  // --- stage 5: Caesar ---
  const sec = rng.fork('caesar');
  const password = `${sec.pick(PASSWORD_WORDS)}${sec.int(100, 999)}`;
  const shift = sec.int(3, 23);
  const places = Object.entries(HIDDEN_DIRS).flatMap(([dir, names]) => names.map((n) => `${dir}/${n}`));
  const keyPlace = sec.pick(places);
  const codes = theme.secretServices.map((service) => ({
    service,
    code: `${letters(sec, 2)}-${sec.int(1000, 9999)}-${letters(sec, 2)}`,
  }));
  const askService = sec.pick(codes);

  const params = {
    theme: theme.key,
    themeLabel: theme.label,
    company: theme.company,
    app,
    service: theme.service,
    attacker,
    nightFrom: NIGHT_FROM,
    backupAt: stamp(BACKUP_AT),
    secretDb: `~/backup/${app}-secret.db`,
    secretService: askService.service,
    logPath: `/var/log/${app}/access.log`,
    sql: theme.sql,
  };
  const answers = {
    '1.1': `/${configRel}`,
    '1.2': String(port),
    '1.3': `/${dbRel}`,
    '1.4': dbMode,
    '2.1': ips.attacker,
    '2.2': access.loginTime,
    '2.3': String(ips.fails),
    '5.1': password,
    '5.2': askService.code,
  };

  const files = sandboxFiles({ theme, app, configRel, port, oldPort, dbRel, dbMode, access, password, shift, keyPlace, places, sec, staff });
  return {
    params,
    answers,
    schemaSql: schema,
    files,
    databases: [
      { path: dbRel, sql: schema, mode: dbMode },
    ],
    protectedDb: {
      path: `home/{user}/backup/${app}-secret.db`,
      password,
      sql: ['CREATE TABLE access_codes (service TEXT NOT NULL, code TEXT NOT NULL);', insertSql('access_codes', codes)].join('\n'),
    },
    caesar: { shift, cipher: caesar(password, shift), keyFile: `~/${keyPlace}` },
  };
}

function letters(rng, n) {
  let s = '';
  for (let i = 0; i < n; i += 1) s += String.fromCharCode(65 + rng.int(0, 25));
  return s;
}

function hex(rng, n) {
  let s = '';
  for (let i = 0; i < n; i += 1) s += '0123456789abcdef'[rng.int(0, 15)];
  return s;
}

// Files of the terminal sandbox, relative to its root ("/" of the server); {user} is the student's home.
function sandboxFiles(o) {
  const { theme, app } = o;
  const files = [];
  const add = (path, content, mode = '644') => files.push({ path, content, mode });
  add(o.configRel, configText(theme, o.port, o.dbRel, true), '640');
  const oldRel = o.configRel.endsWith(`${app}.conf`) ? `etc/${app}/${app}.conf.old` : `etc/${app}/${app}.conf`;
  if (oldRel !== o.configRel) add(oldRel, configText(theme, o.oldPort, `srv/${app}/old/${app}-2024.db`, false), '640');
  add(`usr/share/doc/${app}/${app}.conf.example`, configText(theme, 8080, `srv/${app}/data/example.db`, true).replace('# Действующая конфигурация', '# Пример конфигурации'));
  add(`etc/systemd/system/${app}.service`, [
    '[Unit]',
    `Description=${theme.service}`,
    'After=network.target',
    '',
    '[Service]',
    `ExecStart=/opt/${app}/bin/${app} --config /${o.configRel}`,
    `User=${app}`,
    'Restart=on-failure',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    '',
  ].join('\n'));
  add(`opt/${app}/bin/${app}`, '#!/bin/sh\n# исполняемый файл службы (учебная заглушка)\n', '755');
  add(`opt/${app}/README`, `Служба ${app}: ${theme.service}.\nНастройки — в конфигурационном файле, путь к нему указан в описании службы systemd.\n`);
  add(`var/log/${app}/access.log`, o.access.lines.join('\n') + '\n', '640');
  add(`var/log/${app}/error.log`, `2026-11-18 03:00:01 [info] ротация журналов выполнена\n2026-11-19 03:00:01 [info] ротация журналов выполнена\n`, '640');
  add(`var/backups/${app}/README`, `Ночная резервная копия таблицы ${theme.sql.main} сохраняется в саму базу (таблица ${theme.sql.main}_backup).\n`);

  // Home of the new administrator (the student).
  add('home/{user}/handover.txt', [
    'Передача дел новому администратору',
    '',
    `- Служба ${app} — ${theme.service}. Как она запускается — смотри описание службы в systemd.`,
    '- Журналы службы — в /var/log, читать их можно через sudo.',
    `- Пароль к резервной базе ~/backup/${app}-secret.db я, как всегда, спрятал в скрытом файле в домашнем каталоге.`,
    '  Он зашифрован шифром Цезаря. Сдвиг не скажу — это слово и три цифры, догадаешься.',
    '',
    'Удачи!',
    '',
  ].join('\n'));
  add('home/{user}/backup/README', 'Резервная база защищена паролем: sqlite3 <файл> запросит его.\n');
  o.places.forEach((place) => {
    const content = place === o.keyPlace
      ? `# ключ доступа к резервной базе ~/backup/${app}-secret.db\n# зашифрован шифром Цезаря\n${caesar(o.password, o.shift)}\n`
      : decoy(o.sec, place);
    add(`home/{user}/${place}`, content, '600');
  });
  return files;
}

function decoy(rng, place) {
  if (place.endsWith('.lock')) return `${rng.int(1200, 65000)}\n`;
  if (place.includes('known') || place.includes('cfg')) return `# старая запись\nhost 10.10.${rng.int(1, 9)}.${rng.int(2, 250)}\n`;
  if (place.endsWith('.state') || place.endsWith('.session') || place.endsWith('.restore')) return `session=${hex(rng, 32)}\n`;
  return `${hex(rng, 24)}\n`;
}

module.exports = { buildScenario, caesar, stamp, NIGHT_FROM };
