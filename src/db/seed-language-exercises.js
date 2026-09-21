const { exercises } = require('./language-exercises-data');

function seedLanguageExercises(conn) {
  const { c } = conn.prepare('SELECT COUNT(*) as c FROM language_exercises').get();
  if (c > 0) return;

  const insert = conn.prepare(
    `INSERT INTO language_exercises (id, language, order_index, topic, topic_label, title, description_md)
     VALUES (@id, @language, @orderIndex, @topic, @topicLabel, @title, @descriptionMd)`
  );

  const insertMany = conn.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(exercises);
}

module.exports = { seedLanguageExercises };
