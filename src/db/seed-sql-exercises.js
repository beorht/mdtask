const baseExercises = require('./sql-exercises-data');
const queryExercises = require('./sql-exercises-query-data');

const ALL_EXERCISES = [...baseExercises, ...queryExercises];

// Inserts every exercise whose id isn't in the table yet. Running on each startup (instead
// of only on an empty table) lets new topics reach databases that were seeded earlier —
// existing rows, and the attempts that reference them, are left untouched.
function seedSqlExercises(conn) {
  const insert = conn.prepare(
    `INSERT OR IGNORE INTO sql_exercises
      (id, order_index, topic, title, description_md, schema_sql, allowed_statement, check_type, checker_sql, order_matters, expected_result)
     VALUES (@id, @orderIndex, @topic, @title, @descriptionMd, @schemaSql, @allowedStatement, @checkType, @checkerSql, @orderMatters, @expectedResult)`
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
      checkType: e.checkType,
      checkerSql: e.checkerSql || null,
      orderMatters: e.orderMatters ? 1 : 0,
      expectedResult: JSON.stringify(e.expectedResult),
    }))
  );
}

module.exports = { seedSqlExercises, ALL_EXERCISES };
