const exercises = require('./sql-exercises-data');

function seedSqlExercises(conn) {
  const { c } = conn.prepare('SELECT COUNT(*) as c FROM sql_exercises').get();
  if (c > 0) return;

  const insert = conn.prepare(
    `INSERT INTO sql_exercises
      (id, order_index, topic, title, description_md, schema_sql, allowed_statement, check_type, checker_sql, order_matters, expected_result)
     VALUES (@id, @orderIndex, @topic, @title, @descriptionMd, @schemaSql, @allowedStatement, @checkType, @checkerSql, @orderMatters, @expectedResult)`
  );

  const insertMany = conn.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(
    exercises.map((e) => ({
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

module.exports = { seedSqlExercises };
