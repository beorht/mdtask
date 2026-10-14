const baseExercises = require('./sql-exercises-data');
const queryExercises = require('./sql-exercises-query-data');
const relationsExercises = require('./sql-exercises-relations-data');
const joinExercises = require('./sql-exercises-join-data');
const keysJoinExercises = require('./sql-exercises-keys-join-data');

const ALL_EXERCISES = [...baseExercises, ...queryExercises, ...relationsExercises, ...joinExercises, ...keysJoinExercises];

// Existing rows keep their content, but their position follows the data files: new exercises
// can be inserted in the middle of the chain (e.g. more tasks for an earlier topic), which
// shifts the order_index of the later ones. order_index is UNIQUE, so the moved rows first go
// to temporary negative positions.
function syncOrderIndexes(conn) {
  const current = new Map(conn.prepare('SELECT id, order_index FROM sql_exercises').all().map((r) => [r.id, r.order_index]));
  const moved = ALL_EXERCISES.filter((e) => current.has(e.id) && current.get(e.id) !== e.orderIndex);
  if (moved.length === 0) return;
  const setIndex = conn.prepare('UPDATE sql_exercises SET order_index = ? WHERE id = ?');
  conn.transaction(() => {
    moved.forEach((e, i) => setIndex.run(-1 - i, e.id));
    moved.forEach((e) => setIndex.run(e.orderIndex, e.id));
  })();
}

// Inserts every exercise whose id isn't in the table yet. Running on each startup (instead
// of only on an empty table) lets new topics reach databases that were seeded earlier —
// existing rows, and the attempts that reference them, are left untouched (only their
// order_index follows the data files, see syncOrderIndexes).
function seedSqlExercises(conn) {
  syncOrderIndexes(conn);
  const insert = conn.prepare(
    `INSERT OR IGNORE INTO sql_exercises
      (id, order_index, topic, title, description_md, schema_sql, allowed_statement, allowed_statements, check_type, checker_sql, order_matters, required_keyword, expected_result)
     VALUES (@id, @orderIndex, @topic, @title, @descriptionMd, @schemaSql, @allowedStatement, @allowedStatements, @checkType, @checkerSql, @orderMatters, @requiredKeyword, @expectedResult)`
  );

  const insertMany = conn.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(
    ALL_EXERCISES.map((e) => ({
      id: e.id,
      orderIndex: e.orderIndex,
      topic: e.topic,
      title: e.title,
      descriptionMd: e.descriptionMd,
      schemaSql: e.schemaSql,
      allowedStatement: e.allowedStatement,
      allowedStatements: e.allowedStatements ? JSON.stringify(e.allowedStatements) : null,
      checkType: e.checkType,
      checkerSql: e.checkerSql || null,
      orderMatters: e.orderMatters ? 1 : 0,
      requiredKeyword: e.requiredKeyword || null,
      expectedResult: JSON.stringify(e.expectedResult),
    }))
  );
}

module.exports = { seedSqlExercises, ALL_EXERCISES };
