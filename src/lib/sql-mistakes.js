// "Разбор попыток" for the SQL trainer: sorts a student's wrong attempts at an exercise into
// typical mistakes and explains each one in plain words. Shown to the student once the exercise
// is solved, and to the teacher in the admin (one student's attempts, and the most common
// mistakes per exercise across a group).
//
// classifyAttempt() looks at one attempt (its error message, its SQL and the exercise's starting
// database); buildReport() groups the attempts made before the first correct one and adds the
// patterns that only show across attempts (guessing values, resending the same query).
const Database = require('better-sqlite3');
const { statementType } = require('./sql-sandbox');

const MISTAKES = {
  empty: {
    title: 'Пустой запрос',
    explain: 'На проверку ушло пустое поле.',
    tip: 'Перед отправкой убедитесь, что запрос написан в редакторе.',
  },
  markdown: {
    title: 'Скопирован вместе с ```sql',
    explain: 'В запросе остались строки ```sql и ``` — это оформление кода из чата или статьи, SQLite его не понимает.',
    tip: 'Копируйте только сам запрос. А лучше пишите его сами: так быстрее запоминается.',
  },
  multi_statement: {
    title: 'Несколько операторов в одном запросе',
    explain: 'В этом задании проверяется ровно один оператор, а в запросе их было несколько (через «;»).',
    tip: 'Чтобы посмотреть данные, откройте вкладку «Данные» — для этого не нужен отдельный SELECT.',
  },
  wrong_statement: {
    title: 'Не тот оператор',
    explain: 'Задание проверяет определённый оператор (например, INSERT), а был отправлен другой — чаще всего SELECT, чтобы посмотреть таблицу.',
    tip: 'Смотрите таблицы во вкладках «Структура БД» и «Данные», а на проверку отправляйте оператор из условия.',
  },
  keyword: {
    title: 'Не использована обязательная конструкция',
    explain: 'Результат мог совпасть, но задание требует определённую конструкцию (JOIN, INSERT OR IGNORE …), а запрос обошёлся без неё.',
    tip: 'Перечитайте условие: в нём сказано, какую конструкцию нужно отработать.',
  },
  unique: {
    title: 'Такая запись уже есть (UNIQUE)',
    explain:
      'База отказалась добавлять строку: в таблице уже есть строка с таким же значением ключа. В таблице-связке составной первичный ключ (student_id, course_id) не пускает одну и ту же пару дважды.',
    tip: 'Перед INSERT посмотрите во вкладке «Данные», какие строки уже есть. Чтобы молча пропускать дубликаты, есть INSERT OR IGNORE.',
  },
  foreign_key: {
    title: 'Ссылка на несуществующую строку (FOREIGN KEY)',
    explain:
      'Внешний ключ указывает на id, которого нет в главной таблице, — или строку пытаются удалить, хотя на неё ещё ссылаются другие.',
    tip: 'Добавляйте сначала «одного» (группу, курс), потом «многих» (студентов, записи). Удаляйте в обратном порядке: сначала ссылки, потом то, на что ссылались.',
  },
  not_null: {
    title: 'Пропущено обязательное значение (NOT NULL)',
    explain: 'В столбец с NOT NULL не передали значение.',
    tip: 'Сверьте список столбцов в INSERT со структурой таблицы.',
  },
  check: {
    title: 'Нарушено условие CHECK',
    explain: 'Значение не прошло проверку, заданную в таблице.',
    tip: 'Посмотрите ограничения столбца во вкладке «Структура БД».',
  },
  no_column: {
    title: 'Нет такого столбца',
    explain: 'В запросе указан столбец, которого нет в таблице: опечатка или столбец из другой таблицы.',
    tip: 'Сверяйте имена со вкладкой «Структура БД»: student_id, а не students_id; у курсов — title, а не name.',
  },
  no_table: {
    title: 'Нет такой таблицы',
    explain: 'Имя таблицы написано с ошибкой или такой таблицы в базе нет.',
    tip: 'Имена таблиц — во вкладке «Структура БД» (обычно во множественном числе: students, courses).',
  },
  syntax: {
    title: 'Синтаксическая ошибка',
    explain: 'SQLite не смог разобрать запрос: опечатка в ключевом слове, лишняя или пропущенная запятая, скобка, кавычка, незаконченный запрос.',
    tip: 'Смотрите на слово, рядом с которым SQLite сообщает ошибку (near "…"): ошибка обычно прямо перед ним.',
  },
  other_error: {
    title: 'Другая ошибка SQLite',
    explain: 'Запрос не выполнился.',
    tip: 'Прочитайте текст ошибки — в нём сказано, что именно не так.',
  },
  placeholder: {
    title: 'Значение-заглушка вместо данных',
    explain:
      'В запросе осталось значение из шаблона («Название_группы», «Guruh_Nomi», X, Y …), а не настоящие данные из задания. Такое бывает, когда запрос копируют, не читая.',
    tip: 'Подставляйте значения из условия и вкладки «Данные».',
  },
  outer_column: {
    title: 'Столбец взят из внешнего запроса',
    explain:
      'Во вложенном запросе указан столбец, которого нет в его таблице. SQLite не выдаёт ошибку, а молча берёт столбец с тем же именем из внешнего запроса — и сравнивает совсем не то, что вы хотели. Поэтому результат пустой или неверный, хотя ошибки нет.',
    tip: 'Во вложенном запросе используйте только столбцы его таблицы (у courses — title, не name) или пишите с именем таблицы: courses.title.',
  },
  unknown_value: {
    title: 'Такого значения нет в данных',
    explain: 'Запрос ищет значение, которого нет ни в одной таблице, поэтому условие не находит ни одной строки.',
    tip: 'Скопируйте значение из вкладки «Данные». Сравнение строк в SQLite учитывает регистр: «python» ≠ «Python».',
  },
  wrong_result: {
    title: 'Результат не совпал',
    explain: 'Запрос выполнился, но вернул (или оставил в таблице) не те строки, что ожидались.',
    tip: 'Сравните свой результат с «Ожидаемым результатом» строка за строкой: каких строк не хватает, какие лишние.',
  },
  guessing: {
    title: 'Подбор значений наугад',
    explain: 'Несколько раз подряд отправлялся один и тот же запрос с разными числами — похоже на угадывание id.',
    tip: 'Найдите нужные id во вкладке «Данные» (или SELECT-ом, где он разрешён) — один раз посмотреть быстрее, чем перебирать.',
  },
  repeat: {
    title: 'Повторная отправка того же запроса',
    explain: 'Запрос, который уже не прошёл проверку, отправляли ещё раз без изменений.',
    tip: 'Если запрос не прошёл, сначала разберитесь в ошибке — тот же запрос даст тот же результат.',
  },
};

const PLACEHOLDER_RE = /название|nomi\b|guruh|_группы|_курса|пример|example|your_|ваш[аеи]?_|имя_|course_name|group_name'|\bxxx\b/i;

const SQL_WORDS = new Set(
  (
    'select from where and or not in is null like glob between group by having order asc desc limit offset as distinct all ' +
    'count sum avg min max total join on left right full inner outer cross natural using exists case when then else end ' +
    'union intersect except values insert into update set delete create table primary key references integer text real ' +
    'blob numeric default unique check foreign lower upper length coalesce ifnull nullif round abs cast substr trim ' +
    'replace instr escape collate nocase true false or ignore cascade restrict action no current_date current_time ' +
    'current_timestamp date time datetime strftime typeof printf group_concat'
  ).split(' ')
);

// Tables, columns and string values of the exercise's starting database (cached per exercise).
const schemaCache = new Map();
function schemaInfo(exercise) {
  if (schemaCache.has(exercise.id)) return schemaCache.get(exercise.id);
  const info = { columns: new Map(), values: new Set() };
  let conn;
  try {
    conn = new Database(':memory:');
    if (exercise.schemaSql && exercise.schemaSql.trim()) conn.exec(exercise.schemaSql);
    const tables = conn
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => r.name);
    for (const table of tables) {
      const cols = conn.prepare('SELECT name FROM pragma_table_info(?)').all(table).map((r) => r.name);
      info.columns.set(table.toLowerCase(), cols.map((c) => c.toLowerCase()));
      for (const row of conn.prepare(`SELECT * FROM "${table}"`).all()) {
        for (const v of Object.values(row)) if (typeof v === 'string') info.values.add(v);
      }
    }
  } catch (err) {
    // a broken schema only means fewer hints
  } finally {
    if (conn) conn.close();
  }
  schemaCache.set(exercise.id, info);
  return info;
}

function blankStrings(sql) {
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ');
}

// [{ body }] for every parenthesised SELECT in `sql`, with nested subqueries blanked out, so
// each body holds only its own level.
function subqueries(sql) {
  const code = blankStrings(stripComments(sql));
  const found = [];
  const re = /\(\s*select\b/gi;
  let m;
  while ((m = re.exec(code))) {
    let depth = 0;
    let end = -1;
    for (let i = m.index; i < code.length; i += 1) {
      if (code[i] === '(') depth += 1;
      else if (code[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    let body = code.slice(m.index + 1, end);
    // blank nested parentheses (subqueries, function calls) of this body
    let prev;
    do {
      prev = body;
      body = body.replace(/\([^()]*\)/g, ' ');
    } while (body !== prev);
    found.push({ body });
  }
  return found;
}

// The first bare column of a subquery that its own tables don't have but another table does —
// SQLite silently resolves it against the outer query. { column, table, others } or null.
function outerColumn(sql, info) {
  for (const { body } of subqueries(sql)) {
    const tables = [];
    const aliases = new Set();
    const fromRe = /\b(?:from|join)\s+["`]?(\w+)["`]?(?:\s+(?:as\s+)?(\w+))?/gi;
    let m;
    while ((m = fromRe.exec(body))) {
      tables.push(m[1].toLowerCase());
      if (m[2] && !SQL_WORDS.has(m[2].toLowerCase())) aliases.add(m[2].toLowerCase());
    }
    if (!tables.length || tables.some((t) => !info.columns.has(t))) continue;
    const own = new Set(tables.flatMap((t) => info.columns.get(t)));
    const asAliases = new Set([...body.matchAll(/\bas\s+(\w+)/gi)].map((x) => x[1].toLowerCase()));
    const identRe = /(^|[^.\w])([A-Za-z_]\w*)\b(?!\s*\.)(?!\s*\()/g;
    while ((m = identRe.exec(body))) {
      const name = m[2].toLowerCase();
      if (SQL_WORDS.has(name) || tables.includes(name) || aliases.has(name) || asAliases.has(name) || own.has(name)) continue;
      const others = [...info.columns.entries()].filter(([, cols]) => cols.includes(name)).map(([t]) => t);
      if (others.length) return { column: m[2], table: tables[0], others, tableColumns: [...own] };
    }
  }
  return null;
}

// String literals the query compares against (`= '…'`, `LIKE '…'`, `IN ('…')`) that occur in no
// table of the starting database. Only for queries that read data (not INSERT / CREATE).
function unknownValue(sql, info) {
  if (!info.values.size) return null;
  const code = stripComments(sql);
  const re = /(=|\blike\b|\bglob\b|\bin\s*\(|,)\s*'((?:[^']|'')*)'/gi;
  let m;
  while ((m = re.exec(code))) {
    const raw = m[2].replace(/''/g, "'");
    const op = m[1].toLowerCase();
    const isPattern = op === 'like' || op === 'glob';
    const needle = isPattern ? raw.replace(op === 'like' ? /[%_]/g : /[*?]/g, '') : raw;
    if (!needle) continue;
    const values = [...info.values];
    // LIKE ignores the case of Latin letters, = and GLOB don't
    const found = isPattern
      ? values.some((v) => (op === 'like' ? v.toLowerCase().includes(needle.toLowerCase()) : v.includes(needle)))
      : values.includes(raw);
    if (found) continue;
    const lower = needle.trim().toLowerCase();
    const similar = values.find((v) => v.toLowerCase() === lower) || values.find((v) => lower && (v.toLowerCase().includes(lower) || lower.includes(v.toLowerCase())));
    const typo = similar ? null : values.filter((v) => v.length <= 40).find((v) => editDistance(lower, v.toLowerCase()) <= Math.max(1, Math.floor(lower.length / 4)));
    return { value: raw, similar: similar || typo || null };
  }
  return null;
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function closest(name, candidates) {
  const lower = name.toLowerCase();
  let best = null;
  for (const c of candidates) {
    const d = editDistance(lower, c);
    if (d <= Math.max(2, Math.floor(lower.length / 3)) && (!best || d < best.d)) best = { c, d };
  }
  return best ? best.c : null;
}

// One mistake for one attempt: { key, detail } (detail: a short hint about this attempt), or
// null for a correct attempt.
function classifyAttempt(attempt, exercise) {
  if (attempt.isCorrect) return null;
  const sql = attempt.submittedSql || '';
  const msg = attempt.errorMessage || '';
  const info = schemaInfo(exercise);

  if (!sql.trim()) return { key: 'empty' };
  if (/```/.test(sql)) return { key: 'markdown' };
  if (/только один SQL-оператор/.test(msg)) return { key: 'multi_statement' };
  if (/ожидается запрос|можно использовать только/.test(msg)) {
    const m = /ожидается запрос ([A-Z ]+)/.exec(msg);
    return { key: 'wrong_statement', detail: m ? `нужен ${m[1].trim()}` : null };
  }
  if (/^в этом задании нужно использовать/.test(msg)) return { key: 'keyword' };
  if (/UNIQUE constraint failed/.test(msg)) return { key: 'unique' };
  if (/FOREIGN KEY constraint failed/.test(msg)) return { key: 'foreign_key' };
  if (/NOT NULL constraint failed: (\S+)/.test(msg)) return { key: 'not_null', detail: /NOT NULL constraint failed: (\S+)/.exec(msg)[1] };
  if (/CHECK constraint failed/.test(msg)) return { key: 'check' };

  const column = /no such column: (\S+)/.exec(msg) || /has no column named (\S+)/.exec(msg);
  if (column) {
    const name = column[1].replace(/^.*\./, '');
    if (PLACEHOLDER_RE.test(sql) || /^[XYZ]$/.test(name)) return { key: 'placeholder' };
    const allColumns = [...new Set([...info.columns.values()].flat())];
    const owners = [...info.columns.entries()].filter(([, cols]) => cols.includes(name.toLowerCase())).map(([t]) => t);
    const near = closest(name, allColumns);
    let detail = `«${name}»`;
    if (owners.length === 1) detail += ` есть только в таблице ${owners[0]} — проверьте, к какой таблице вы его применяете`;
    else if (owners.length) detail += ` есть в таблицах ${owners.join(', ')} — проверьте, к какой таблице вы его применяете`;
    else if (near) detail += ` → правильно «${near}»`;
    return { key: 'no_column', detail };
  }
  const table = /no such table: (\S+)/.exec(msg);
  if (table) {
    const near = closest(table[1], [...info.columns.keys()]);
    return { key: 'no_table', detail: `«${table[1]}»${near ? ` → правильно «${near}»` : ''}` };
  }
  if (/syntax error|incomplete input|unrecognized token/.test(msg)) {
    const near = /near "([^"]*)"/.exec(msg);
    return { key: 'syntax', detail: near ? `рядом с «${near[1]}»` : msg.replace(/^Оператор №\d+: /, '') };
  }
  if (attempt.isError) return { key: 'other_error', detail: msg };

  // Ran, but the result is wrong.
  if (PLACEHOLDER_RE.test(sql)) return { key: 'placeholder' };
  const outer = outerColumn(sql, info);
  if (outer) {
    return {
      key: 'outer_column',
      detail: `в подзапросе по ${outer.table} столбец «${outer.column}» — его нет в ${outer.table}, он взят из ${outer.others.join(', ')}`,
    };
  }
  const type = statementType(sql);
  if (type !== 'INSERT' && type !== 'CREATE TABLE') {
    const unknown = unknownValue(sql, info);
    if (unknown) {
      return {
        key: 'unknown_value',
        detail: `«${unknown.value}»${unknown.similar ? ` — в данных есть «${unknown.similar}»` : ''}`,
      };
    }
  }
  return { key: 'wrong_result' };
}

const normalize = (sql) => stripComments(sql || '').replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const shape = (sql) => normalize(sql).replace(/\b\d+\b/g, '#');

// The report for one student's attempts at one exercise (any order). Only attempts made before
// the first correct one count; null if there are no attempts at all.
//   { attempts, wrong, solved, firstTry, items: [{ key, title, explain, tip, count, details }] }
function buildReport(attempts, exercise) {
  if (!attempts || attempts.length === 0) return null;
  const ordered = [...attempts].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const firstCorrect = ordered.findIndex((a) => a.isCorrect);
  const counted = firstCorrect === -1 ? ordered : ordered.slice(0, firstCorrect + 1);
  const wrongAttempts = counted.filter((a) => !a.isCorrect);

  const items = new Map();
  const add = (key, detail) => {
    if (!items.has(key)) items.set(key, { key, ...MISTAKES[key], count: 0, details: [] });
    const item = items.get(key);
    item.count += 1;
    if (detail && !item.details.includes(detail) && item.details.length < 5) item.details.push(detail);
  };

  let repeats = 0;
  wrongAttempts.forEach((a, i) => {
    const mistake = classifyAttempt(a, exercise);
    if (mistake) add(mistake.key, mistake.detail);
    if (i > 0 && normalize(a.submittedSql) === normalize(wrongAttempts[i - 1].submittedSql)) repeats += 1;
  });

  // The same data-changing query with only the numbers changed, three times or more.
  const byShape = new Map();
  for (const a of wrongAttempts) {
    const type = statementType(a.submittedSql || '');
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(type)) continue;
    const key = shape(a.submittedSql);
    if (!byShape.has(key)) byShape.set(key, new Set());
    byShape.get(key).add(normalize(a.submittedSql));
  }
  const guessed = Math.max(0, ...[...byShape.values()].map((s) => s.size));
  if (guessed >= 3) {
    items.set('guessing', { key: 'guessing', ...MISTAKES.guessing, count: guessed, details: [] });
  }
  if (repeats > 0) items.set('repeat', { key: 'repeat', ...MISTAKES.repeat, count: repeats, details: [] });

  return {
    attempts: counted.length,
    wrong: wrongAttempts.length,
    solved: firstCorrect !== -1,
    firstTry: firstCorrect === 0,
    items: [...items.values()].sort((a, b) => b.count - a.count),
  };
}

// Most common mistakes per exercise across students: [{ exercise, students, wrong, items:
// [{ key, title, attempts, students }] }] for exercises with at least one wrong attempt.
function mistakesByExercise(exercises, attempts) {
  const byPair = new Map();
  for (const a of attempts) {
    const key = `${a.exerciseId}::${a.studentId}`;
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(a);
  }
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const stats = new Map();
  for (const [key, list] of byPair) {
    const exercise = exerciseById.get(key.split('::')[0]);
    if (!exercise) continue;
    const report = buildReport(list, exercise);
    if (!report || report.wrong === 0) continue;
    if (!stats.has(exercise.id)) stats.set(exercise.id, { exercise, students: 0, wrong: 0, items: new Map() });
    const s = stats.get(exercise.id);
    s.students += 1;
    s.wrong += report.wrong;
    for (const item of report.items) {
      const agg = s.items.get(item.key) || { key: item.key, title: item.title, attempts: 0, students: 0, details: [] };
      agg.attempts += item.count;
      agg.students += 1;
      for (const d of item.details) if (!agg.details.includes(d) && agg.details.length < 3) agg.details.push(d);
      s.items.set(item.key, agg);
    }
  }
  return exercises
    .filter((e) => stats.has(e.id))
    .map((e) => {
      const s = stats.get(e.id);
      return { ...s, items: [...s.items.values()].sort((a, b) => b.students - a.students || b.attempts - a.attempts) };
    });
}

module.exports = { MISTAKES, classifyAttempt, buildReport, mistakesByExercise, outerColumn, schemaInfo };
