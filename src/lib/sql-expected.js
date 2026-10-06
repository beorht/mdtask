// "Ожидаемый результат" for every trainer exercise, not only SELECT ones. Builds a view model
// from the exercise's stored expectation:
//   select_match            → kind 'rows': the expected result set;
//   CREATE TABLE            → kind 'table': the expected (empty) table — columns with type/keys;
//   INSERT / UPDATE / DELETE → kind 'rows': the table contents after the query, with new/changed
//                              rows marked and removed rows listed (diffed against the start data);
//   DROP TABLE              → kind 'drop': which table must disappear and which must remain.
const Database = require('better-sqlite3');

const cache = new Map();

function startingDb(exercise) {
  const conn = new Database(':memory:');
  conn.pragma('foreign_keys = ON');
  if (exercise.schemaSql && exercise.schemaSql.trim()) conn.exec(exercise.schemaSql);
  return conn;
}

function listTables(conn) {
  return conn
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
    .all()
    .map((r) => r.name);
}

function tableFromChecker(sql) {
  const m =
    /table_info\(\s*['"`]?(\w+)/i.exec(sql) || /name\s*=\s*'(\w+)'/i.exec(sql) || /\bFROM\s+["`]?(\w+)/i.exec(sql);
  return m ? m[1] : null;
}

const rowKey = (row) => JSON.stringify(row, Object.keys(row).sort());

function describeSelect(exercise) {
  const rows = exercise.expectedResult;
  return {
    kind: 'rows',
    title: 'Ожидаемый результат',
    note: `${rows.length} стр.${exercise.orderMatters ? ', порядок строк важен' : ''}`,
    columns: rows.length ? Object.keys(rows[0]) : [],
    rows: rows.map((values) => ({ values })),
    removed: [],
  };
}

// Normalises both checker shapes: PRAGMA table_info rows and the relations structure checker.
function describeCreate(exercise) {
  const tableName = tableFromChecker(exercise.checkerSql);
  const columns = exercise.expectedResult.map((c) => {
    const notNull = c.notnull !== undefined ? !!c.notnull : !!c.not_null;
    const meta = [c.type || '—'];
    if (c.pk) meta.push('PK');
    if (notNull) meta.push('NOT NULL');
    if (c.is_unique) meta.push('UNIQUE');
    if (c.dflt_value !== undefined && c.dflt_value !== null) meta.push(`DEFAULT ${c.dflt_value}`);
    if (c.ref_table) meta.push(`FK → ${c.ref_table}.${c.ref_column || 'id'}`);
    return { name: c.name, meta: meta.join(' · ') };
  });
  return {
    kind: 'table',
    title: tableName ? `Ожидаемая структура таблицы ${tableName}` : 'Ожидаемая структура таблицы',
    note: 'таблица создаётся пустой',
    tableName,
    columns,
  };
}

function describeDrop(exercise) {
  const dropped = tableFromChecker(exercise.checkerSql);
  const conn = startingDb(exercise);
  try {
    const remaining = listTables(conn).filter((t) => t !== dropped);
    return { kind: 'drop', title: 'Ожидаемый результат', note: 'состояние базы после запроса', dropped, remaining };
  } finally {
    conn.close();
  }
}

function describeDataChange(exercise) {
  const tableName = tableFromChecker(exercise.checkerSql);
  const conn = startingDb(exercise);
  let columns;
  let before = [];
  try {
    const stmt = conn.prepare(exercise.checkerSql);
    columns = stmt.columns().map((c) => c.name);
    before = stmt.all();
  } catch (e) {
    columns = exercise.expectedResult.length ? Object.keys(exercise.expectedResult[0]) : [];
  } finally {
    conn.close();
  }

  const beforeKeys = new Set(before.map(rowKey));
  const afterKeys = new Set(exercise.expectedResult.map(rowKey));
  const rows = exercise.expectedResult.map((values) => ({ values, changed: !beforeKeys.has(rowKey(values)) }));
  const removed = before.filter((r) => !afterKeys.has(rowKey(r))).map((values) => ({ values }));

  const verb = { INSERT: 'добавления', UPDATE: 'изменения', DELETE: 'удаления' }[exercise.allowedStatement] || 'запроса';
  return {
    kind: 'rows',
    title: tableName ? `Ожидаемое содержимое таблицы ${tableName} после ${verb}` : 'Ожидаемое содержимое таблицы',
    note: rows.length ? `${rows.length} стр.` : `таблица должна ${exercise.allowedStatement === 'DELETE' ? 'стать' : 'остаться'} пустой`,
    columns,
    rows,
    removed,
    removedLabel: exercise.allowedStatement === 'UPDATE' ? 'Было до изменения' : 'Удалены из таблицы',
    showLegend: rows.some((r) => r.changed) || removed.length > 0,
  };
}

function describeExpected(exercise) {
  if (cache.has(exercise.id)) return cache.get(exercise.id);
  let view = null;
  try {
    if (exercise.checkType === 'select_match') view = describeSelect(exercise);
    else if (exercise.allowedStatement === 'CREATE TABLE') view = describeCreate(exercise);
    else if (exercise.allowedStatement === 'DROP TABLE') view = describeDrop(exercise);
    else view = describeDataChange(exercise);
  } catch (e) {
    view = null; // never break the exercise page because of the preview
  }
  cache.set(exercise.id, view);
  return view;
}

module.exports = { describeExpected };
