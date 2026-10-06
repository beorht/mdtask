// Practice for the "Связи между таблицами" topic (it sits right before JOIN): building
// one-to-many, many-to-many and one-to-one links, changing linked data (INSERT / UPDATE /
// DELETE by ids), and reading related data with subqueries — JOIN comes in the next topic.
//
// Like sql-exercises-query-data.js, every exercise carries a reference `solution` and its
// expected result is computed from it: for `select_match` the solution's rows, for
// `state_check` the checker query run after the solution. Solutions never reach the DB.

const Database = require('better-sqlite3');

// Column list of a table plus where each column points (if it's a foreign key). Types are
// upper-cased and a bare `REFERENCES t` counts as `REFERENCES t(id)`, so equivalent
// spellings of the same design are all accepted.
function structureChecker(table) {
  return `SELECT p.name, UPPER(p.type) AS type, p."notnull" AS not_null, p.pk,
  f."table" AS ref_table,
  COALESCE(f."to", CASE WHEN f."table" IS NOT NULL THEN 'id' END) AS ref_column
FROM pragma_table_info('${table}') p
LEFT JOIN pragma_foreign_key_list('${table}') f ON f."from" = p.name
ORDER BY p.cid`;
}

// Same as structureChecker plus `is_unique`: whether the column alone carries a UNIQUE
// constraint (needed to tell a one-to-one link from a one-to-many one).
function structureWithUniqueChecker(table) {
  return `SELECT p.name, UPPER(p.type) AS type, p."notnull" AS not_null, p.pk,
  f."table" AS ref_table,
  COALESCE(f."to", CASE WHEN f."table" IS NOT NULL THEN 'id' END) AS ref_column,
  EXISTS (
    SELECT 1 FROM pragma_index_list('${table}') il
    WHERE il."unique" = 1
      AND (SELECT COUNT(*) FROM pragma_index_info(il.name)) = 1
      AND (SELECT name FROM pragma_index_info(il.name)) = p.name
  ) AS is_unique
FROM pragma_table_info('${table}') p
LEFT JOIN pragma_foreign_key_list('${table}') f ON f."from" = p.name
ORDER BY p.cid`;
}

const GROUPS_ONLY = `
CREATE TABLE groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
INSERT INTO groups (id, name) VALUES
  (1, 'WEB-21'),
  (2, 'IB-22');
`;

const STUDENTS_AND_COURSES = `
CREATE TABLE groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  group_id INTEGER NOT NULL REFERENCES groups(id)
);
CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE
);
INSERT INTO groups (id, name) VALUES
  (1, 'WEB-21'),
  (2, 'IB-22');
INSERT INTO students (id, name, group_id) VALUES
  (1, 'Алишер', 1),
  (2, 'Мадина', 1),
  (3, 'Тимур', 2),
  (4, 'Севара', 2),
  (5, 'Даниил', 1);
INSERT INTO courses (id, title) VALUES
  (1, 'Python'),
  (2, 'Базы данных'),
  (3, 'JavaScript');
`;

const SCHOOL_SCHEMA = `${STUDENTS_AND_COURSES}
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO enrollments (student_id, course_id) VALUES
  (1, 1),
  (1, 2),
  (2, 3),
  (3, 1),
  (3, 2),
  (5, 1);
`;

// Exercises 6–12 add a course nobody has enrolled in yet, so "courses without students"
// has an answer. The first five keep SCHOOL_SCHEMA unchanged (already seeded in real DBs).
const SCHOOL_SCHEMA_EXT = `${SCHOOL_SCHEMA}
INSERT INTO courses (id, title) VALUES (4, 'Алгоритмы');
`;

const FIRST_ORDER_INDEX = 107;

const DEFINITIONS = [
  {
    id: 'relations-1',
    title: 'Один ко многим: студенты и группы',
    descriptionMd:
      'В базе уже есть таблица `groups (id, name)`. В одной группе учится много студентов, а каждый студент — ровно в одной группе: это связь **«один ко многим»**.\n\n' +
      'Создайте таблицу `students` со столбцами:\n' +
      '- `id INTEGER PRIMARY KEY`\n' +
      '- `name TEXT NOT NULL`\n' +
      '- `group_id INTEGER NOT NULL` — внешний ключ на `groups(id)`\n\n' +
      'Подумайте, в какой таблице должен жить внешний ключ: у «многих» (студентов) или у «одного» (группы)?',
    schemaSql: GROUPS_ONLY,
    allowedStatement: 'CREATE TABLE',
    checkType: 'state_check',
    checkerSql: structureChecker('students'),
    solution:
      'CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, group_id INTEGER NOT NULL REFERENCES groups(id))',
  },
  {
    id: 'relations-2',
    title: 'Многие ко многим: таблица-связка',
    descriptionMd:
      'Есть таблицы `students` и `courses`. Один студент может записаться на несколько курсов, а на одном курсе учится много студентов — это связь **«многие ко многим»**. Одним внешним ключом её не выразить, нужна промежуточная таблица.\n\n' +
      'Создайте таблицу `enrollments` (записи на курсы):\n' +
      '- `student_id INTEGER NOT NULL` — внешний ключ на `students(id)`\n' +
      '- `course_id INTEGER NOT NULL` — внешний ключ на `courses(id)`\n' +
      '- составной первичный ключ `PRIMARY KEY (student_id, course_id)` — чтобы одного студента нельзя было записать на один курс дважды.',
    schemaSql: STUDENTS_AND_COURSES,
    allowedStatement: 'CREATE TABLE',
    checkType: 'state_check',
    checkerSql: structureChecker('enrollments'),
    solution:
      'CREATE TABLE enrollments (student_id INTEGER NOT NULL REFERENCES students(id), course_id INTEGER NOT NULL REFERENCES courses(id), PRIMARY KEY (student_id, course_id))',
  },
  {
    id: 'relations-3',
    title: 'Запись на курс по идентификаторам',
    descriptionMd:
      'Севара хочет записаться на курс «Базы данных». В таблицу-связку пишутся не имена и названия, а **идентификаторы**.\n\n' +
      'Посмотрите в таблицах `students` и `courses`, какие `id` у Севары и у курса «Базы данных», и добавьте одну строку в `enrollments (student_id, course_id)`.\n\n' +
      'Проверка внешних ключей включена: если указать несуществующий `id`, база выдаст ошибку `FOREIGN KEY constraint failed`.',
    schemaSql: SCHOOL_SCHEMA,
    allowedStatement: 'INSERT',
    checkType: 'state_check',
    checkerSql: 'SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id',
    solution: 'INSERT INTO enrollments (student_id, course_id) VALUES (4, 2)',
  },
  {
    id: 'relations-4',
    title: 'Студенты группы через подзапрос',
    descriptionMd:
      'Выведите столбец `name` всех студентов группы **WEB-21**.\n\n' +
      'В таблице `students` хранится только `group_id`, а название группы — в `groups`. Найдите `id` группы вложенным запросом: `WHERE group_id = (SELECT id FROM groups WHERE name = ...)`. Соединять таблицы через JOIN будем в следующей теме.',
    schemaSql: SCHOOL_SCHEMA,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution: "SELECT name FROM students WHERE group_id = (SELECT id FROM groups WHERE name = 'WEB-21')",
  },
  {
    id: 'relations-5',
    title: 'Кто учится на курсе Python',
    descriptionMd:
      'Выведите столбец `name` всех студентов, записанных на курс **Python**.\n\n' +
      'Цепочка такая: название курса → его `id` в `courses` → `student_id` в `enrollments` → имена в `students`. Используйте вложенные запросы и оператор `IN`, потому что студентов несколько.',
    schemaSql: SCHOOL_SCHEMA,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution:
      "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE title = 'Python'))",
  },
  {
    id: 'relations-6',
    title: 'Один к одному: студенческий билет',
    descriptionMd:
      'У каждого студента ровно один студенческий билет, и каждый билет принадлежит ровно одному студенту — это связь **«один к одному»**.\n\n' +
      'Создайте таблицу `student_cards`:\n' +
      '- `id INTEGER PRIMARY KEY`\n' +
      '- `student_id INTEGER NOT NULL UNIQUE` — внешний ключ на `students(id)`\n' +
      '- `card_number TEXT NOT NULL`\n\n' +
      'Именно `UNIQUE` на внешнем ключе превращает «один ко многим» в «один к одному»: второй билет для того же студента база не примет.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'CREATE TABLE',
    checkType: 'state_check',
    checkerSql: structureWithUniqueChecker('student_cards'),
    solution:
      'CREATE TABLE student_cards (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL UNIQUE REFERENCES students(id), card_number TEXT NOT NULL)',
  },
  {
    id: 'relations-7',
    title: 'Новый студент в существующей группе',
    descriptionMd:
      'В колледж поступила **Камола**, она будет учиться в группе **IB-22**. Добавьте её в таблицу `students (id, name, group_id)` с `id = 6`.\n\n' +
      'Название группы в `students` не пишется — нужен `id` группы из таблицы `groups`.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'INSERT',
    checkType: 'state_check',
    checkerSql: 'SELECT id, name, group_id FROM students ORDER BY id',
    solution: "INSERT INTO students (id, name, group_id) VALUES (6, 'Камола', 2)",
  },
  {
    id: 'relations-8',
    title: 'Перевод студента в другую группу',
    descriptionMd:
      '**Даниил** (`id = 5`) переводится из WEB-21 в группу **IB-22**. Обновите одну строку в `students`.\n\n' +
      'Обратите внимание: благодаря разделению таблиц перевод — это изменение **одного числа** `group_id`. В «плоской» таблице пришлось бы переписывать название группы и куратора во всех строках студента.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'UPDATE',
    checkType: 'state_check',
    checkerSql: 'SELECT id, name, group_id FROM students ORDER BY id',
    solution: 'UPDATE students SET group_id = 2 WHERE id = 5',
  },
  {
    id: 'relations-9',
    title: 'Отписка от курса',
    descriptionMd:
      '**Мадина** (`id = 2`) отказалась от курса **JavaScript** (`id = 3`). Удалите соответствующую запись из таблицы-связки `enrollments`.\n\n' +
      'Удаляется только факт записи: сама Мадина и курс JavaScript остаются в своих таблицах. Не забудьте условие сразу по **двум** столбцам.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'DELETE',
    checkType: 'state_check',
    checkerSql: 'SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id',
    solution: 'DELETE FROM enrollments WHERE student_id = 2 AND course_id = 3',
  },
  {
    id: 'relations-10',
    title: 'Сколько студентов на каждом курсе',
    descriptionMd:
      'Посчитайте по таблице-связке `enrollments`, сколько студентов записано на каждый курс. Выведите столбцы `course_id` и `students_count`.\n\n' +
      'В результат попадут только курсы, на которые кто-то записан. Названия курсов рядом с числами покажем в теме JOIN.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution: 'SELECT course_id, COUNT(*) AS students_count FROM enrollments GROUP BY course_id',
  },
  {
    id: 'relations-11',
    title: 'Курсы, на которые никто не записан',
    descriptionMd:
      'Учебная часть хочет закрыть пустые курсы. Выведите столбец `title` курсов, на которые **не записан ни один** студент.\n\n' +
      'Подсказка: курс пустой, если его `id` **нет** среди `course_id` в `enrollments` — используйте `NOT IN` с вложенным запросом.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution: 'SELECT title FROM courses WHERE id NOT IN (SELECT course_id FROM enrollments)',
  },
  {
    id: 'relations-12',
    title: 'Студенты с двумя курсами и больше',
    descriptionMd:
      'Выведите столбец `name` студентов, которые записаны **на два курса или больше**.\n\n' +
      'Сначала во вложенном запросе сгруппируйте `enrollments` по `student_id` и оставьте группы с `HAVING COUNT(*) >= 2`, затем найдите имена этих студентов через `IN`.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution:
      'SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments GROUP BY student_id HAVING COUNT(*) >= 2)',
  },
];

function computeExpected(def) {
  const conn = new Database(':memory:');
  try {
    conn.pragma('foreign_keys = ON');
    conn.exec(def.schemaSql);
    if (def.checkType === 'select_match') return conn.prepare(def.solution).all();
    conn.exec(def.solution);
    return conn.prepare(def.checkerSql).all();
  } finally {
    conn.close();
  }
}

const exercises = DEFINITIONS.map((def, i) => ({
  id: def.id,
  orderIndex: FIRST_ORDER_INDEX + i,
  topic: 'relations',
  title: def.title,
  descriptionMd: def.descriptionMd,
  schemaSql: def.schemaSql,
  allowedStatement: def.allowedStatement,
  checkType: def.checkType,
  checkerSql: def.checkerSql || null,
  orderMatters: false,
  expectedResult: computeExpected(def),
}));

module.exports = exercises;
module.exports.SOLUTIONS = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d.solution]));
