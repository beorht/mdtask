// Stage 4 of the IB final exam: SQL on the student's own copy of the company database
// (schema and data from scenario.js). Every run starts from a fresh in-memory database, so a
// broken UPDATE never spoils the next attempt. The expected result of each task comes from its
// reference solution, run on the same data. Statement parsing is the trainer's (sql-sandbox.js).
const Database = require('better-sqlite3');
const { parseSubmission, containsKeyword } = require('../sql-sandbox');

const MAX_ROWS = 500;

function tasksFor(params) {
  const s = params.sql;
  const x = params.attacker;
  const night = params.nightFrom;
  const main = s.main;
  const backup = `${main}_backup`;
  const person = s.person;
  const by = `login = '${x}' AND at >= '${night}'`;
  const intro =
    `Злоумышленник работал под учётной записью \`${x}\` в ночь на 19 ноября (после ${night}). ` +
    `Каждое изменение таблицы \`${main}\` записано в журнал \`audit_log\`: кто (\`login\`), что сделал (\`action\`: UPDATE, DELETE, INSERT), ` +
    `с какой записью (\`record_id\`), старое и новое значение (\`old_value\`, \`new_value\`) и когда (\`at\`). ` +
    `Резервная копия \`${backup}\` снята ${params.backupAt}, до нападения.`;
  return [
    {
      id: '4.1',
      title: 'Что изменил злоумышленник',
      points: 5,
      statement: [
        intro,
        '',
        `Выведите все записи, которые \`${x}\` изменил или удалил после ${night}.`,
        '',
        'Столбцы результата (назовите их ровно так, через AS):',
        '',
        '- `record_id` — номер записи;',
        '- `action` — действие (UPDATE или DELETE);',
        `- \`${person.column}\` — ${person.label}: имя из таблицы \`${person.table}\`;`,
        `- \`${s.value}\` — ${s.valueLabel} **по резервной копии** \`${backup}\`.`,
        '',
        'Строки отсортируйте по `record_id`. В запросе нужно использовать JOIN.',
      ].join('\n'),
      allowedStatement: 'SELECT',
      requiredKeyword: 'JOIN',
      checkType: 'select_match',
      orderMatters: true,
      solution:
        `SELECT a.record_id AS record_id, a.action AS action, p.name AS ${person.column}, b.${s.value} AS ${s.value} ` +
        `FROM audit_log a JOIN ${backup} b ON b.id = a.record_id JOIN ${person.table} p ON p.id = b.${person.fk} ` +
        `WHERE a.${by.replace(' AND at', ' AND a.at')} ORDER BY a.record_id`,
    },
    {
      id: '4.2',
      title: 'Оценка ущерба',
      points: 5,
      statement: [
        intro,
        '',
        `Для каждого действия злоумышленника (UPDATE и DELETE после ${night}) посчитайте:`,
        '',
        '- `cnt` — сколько записей затронуто;',
        `- \`damage\` — ущерб: на сколько уменьшилась ${s.valueLabel}, то есть значение \`${s.value}\` в резервной копии минус текущее значение в \`${main}\`. ` +
          'У удалённой записи текущего значения нет, считайте его равным 0 (пригодятся LEFT JOIN и COALESCE).',
        '',
        'Столбцы результата: `action`, `cnt`, `damage`. Порядок строк любой. В запросе нужен GROUP BY.',
      ].join('\n'),
      allowedStatement: 'SELECT',
      requiredKeyword: 'GROUP',
      checkType: 'select_match',
      orderMatters: false,
      solution:
        `SELECT a.action AS action, COUNT(*) AS cnt, SUM(b.${s.value} - COALESCE(m.${s.value}, 0)) AS damage ` +
        `FROM audit_log a JOIN ${backup} b ON b.id = a.record_id LEFT JOIN ${main} m ON m.id = a.record_id ` +
        `WHERE a.login = '${x}' AND a.at >= '${night}' GROUP BY a.action`,
    },
    {
      id: '4.3',
      title: 'Восстановление данных',
      points: 5,
      statement: [
        intro,
        '',
        `Верните таблице \`${main}\` данные, испорченные злоумышленником:`,
        '',
        `1. записям, которые \`${x}\` изменил (UPDATE) после ${night}, верните значение \`${s.value}\` из резервной копии;`,
        `2. записи, которые он удалил (DELETE), вставьте обратно из \`${backup}\` целиком.`,
        '',
        `Остальные записи не трогайте: утром 19 ноября сотрудники внесли в \`${main}\` честные изменения и новые записи, которых в резервной копии нет. ` +
          'Поэтому просто заменить всю таблицу копией нельзя.',
        '',
        'Можно написать несколько операторов UPDATE и INSERT через «;». Проверяется итоговое состояние таблицы ' + `\`${main}\`.`,
      ].join('\n'),
      allowedStatement: 'UPDATE',
      allowedStatements: ['UPDATE', 'INSERT'],
      checkType: 'state_check',
      checkerSql: `SELECT * FROM ${main} ORDER BY id`,
      orderMatters: true,
      solution:
        `UPDATE ${main} SET ${s.value} = (SELECT b.${s.value} FROM ${backup} b WHERE b.id = ${main}.id) ` +
        `WHERE id IN (SELECT record_id FROM audit_log WHERE ${by} AND action = 'UPDATE'); ` +
        `INSERT INTO ${main} SELECT * FROM ${backup} WHERE id IN (SELECT record_id FROM audit_log WHERE ${by} AND action = 'DELETE')`,
    },
    {
      id: '4.4',
      title: 'Блокировка учётной записи',
      points: 5,
      statement: [
        `Пока расследование не закончено, учётную запись \`${x}\` нужно заблокировать.`,
        '',
        `В таблице \`staff\` у неё поле \`active\` должно стать 0. Остальные учётные записи должны остаться активными. ` +
          'Проверяется итоговое состояние таблицы `staff`.',
      ].join('\n'),
      allowedStatement: 'UPDATE',
      checkType: 'state_check',
      checkerSql: 'SELECT * FROM staff ORDER BY login',
      orderMatters: true,
      solution: `UPDATE staff SET active = 0 WHERE login = '${x}'`,
    },
  ];
}

function openDb(schemaSql) {
  const conn = new Database(':memory:');
  conn.pragma('foreign_keys = ON');
  conn.exec(schemaSql);
  return conn;
}

// Runs the statements in order; the result shown is that of the last SELECT.
function execute(conn, statements) {
  let lastSelect = null;
  let changes;
  statements.forEach((statement, i) => {
    let stmt;
    try {
      stmt = conn.prepare(statement);
      if (stmt.reader) {
        const rows = stmt.all();
        lastSelect = { columns: stmt.columns().map((c) => c.name), rows };
      } else {
        changes = (changes || 0) + stmt.run().changes;
      }
    } catch (err) {
      if (statements.length > 1) err.message = `Оператор №${i + 1}: ${err.message}`;
      throw err;
    }
  });
  return { columns: lastSelect ? lastSelect.columns : [], rows: lastSelect ? lastSelect.rows : [], changes };
}

function normalize(rows) {
  return rows.map((r) => JSON.stringify(r, Object.keys(r).sort()));
}

function rowsMatch(actual, expected, orderMatters) {
  if (actual.length !== expected.length) return false;
  const a = normalize(actual);
  const e = normalize(expected);
  if (orderMatters) return a.every((v, i) => v === e[i]);
  return [...a].sort().join('\n') === [...e].sort().join('\n');
}

function graded(task, conn, result) {
  return task.checkType === 'select_match' ? result.rows : conn.prepare(task.checkerSql).all();
}

function expectedRows(task, schemaSql) {
  const conn = openDb(schemaSql);
  try {
    const parsed = parseSubmission(task.solution, task);
    if (parsed.error) throw new Error(`эталон задания ${task.id}: ${parsed.error}`);
    return graded(task, conn, execute(conn, parsed.statements));
  } finally {
    conn.close();
  }
}

// One run of the student's SQL. check: also compare with the expected result.
function runSql(task, schemaSql, sql, { check = false } = {}) {
  const parsed = parseSubmission(sql, task);
  if (parsed.error) return { success: false, error: parsed.error, isCorrect: false };
  const conn = openDb(schemaSql);
  try {
    const result = execute(conn, parsed.statements);
    const shown = task.checkType === 'state_check' && !result.columns.length
      ? { columns: null, rows: conn.prepare(task.checkerSql).all(), stateCaption: true }
      : { columns: result.columns, rows: result.rows };
    const out = {
      success: true,
      columns: shown.columns || Object.keys(shown.rows[0] || {}),
      rows: shown.rows.slice(0, MAX_ROWS),
      rowCount: shown.rows.length,
      changes: result.changes,
      stateCaption: !!shown.stateCaption,
    };
    if (check) {
      const notice = task.requiredKeyword && !containsKeyword(sql, task.requiredKeyword)
        ? `в этом задании нужно использовать ${task.requiredKeyword === 'GROUP' ? 'GROUP BY' : task.requiredKeyword}.`
        : null;
      out.notice = notice;
      out.isCorrect = !notice && rowsMatch(graded(task, conn, result), expectedRows(task, schemaSql), task.orderMatters);
    }
    return out;
  } catch (err) {
    return { success: false, error: err.message, isCorrect: false };
  } finally {
    conn.close();
  }
}

// Tables of the database for the task page: columns and all rows (the tables are small).
function tablesOf(schemaSql) {
  const conn = openDb(schemaSql);
  try {
    return conn
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
      .all()
      .map(({ name }) => {
        const stmt = conn.prepare(`SELECT * FROM "${name}"`);
        return {
          name,
          columns: conn.prepare('SELECT name, type, pk FROM pragma_table_info(?)').all(name),
          rows: stmt.all(),
        };
      });
  } finally {
    conn.close();
  }
}

module.exports = { tasksFor, runSql, expectedRows, tablesOf };
