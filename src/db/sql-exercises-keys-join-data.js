// Practice for the separate "Практикум" section, topic "Ключи, связи и JOIN" (after JOIN):
// PRIMARY KEY, FOREIGN KEY, linked data by ids and reading it back with JOIN, on the college
// database from the relations/JOIN topics plus teachers. keys-1…8: six easy + two medium;
// keys-9…12 (added later, so they continue the order): two easy + two medium JOIN tasks.
//
// Like the relations exercises, each carries a reference `solution` and the expected result
// is computed from it (select_match: the solution's rows, state_check: the checker query run
// after the solution). The JOIN tasks set `requiredKeyword: 'JOIN'`: a correct result without
// JOIN (e.g. via a subquery) is not accepted.

const Database = require('better-sqlite3');
const { structureChecker } = require('./sql-exercises-relations-data');
const joinExercises = require('./sql-exercises-join-data');

// Right after the last JOIN exercise.
const FIRST_ORDER_INDEX = joinExercises[joinExercises.length - 1].orderIndex + 1;

const BASE = `
CREATE TABLE groups (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  group_id INTEGER NOT NULL REFERENCES groups(id)
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
`;

const TEACHERS = `
CREATE TABLE teachers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO teachers (id, name) VALUES
  (1, 'Нигора Каримова'),
  (2, 'Бахтиёр Рахимов'),
  (3, 'Ольга Ким');
`;

const COURSES_TABLE = `
CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  teacher_id INTEGER REFERENCES teachers(id)
);
`;

const ENROLLMENTS = `
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

// Python has no teacher yet (task 4 assigns one).
const BEFORE_ASSIGN = `${BASE}${TEACHERS}${COURSES_TABLE}
INSERT INTO courses (id, title, teacher_id) VALUES
  (1, 'Python', NULL),
  (2, 'Базы данных', 2),
  (3, 'JavaScript', 1),
  (4, 'Алгоритмы', NULL);
${ENROLLMENTS}`;

// Full database: Ольга Ким has no courses, «Алгоритмы» has no teacher.
const FULL = `${BASE}${TEACHERS}${COURSES_TABLE}
INSERT INTO courses (id, title, teacher_id) VALUES
  (1, 'Python', 2),
  (2, 'Базы данных', 2),
  (3, 'JavaScript', 1),
  (4, 'Алгоритмы', NULL);
${ENROLLMENTS}`;

const TABLES_NOTE =
  'Название курса хранится в столбце `courses.title` (не `name`). Данные всех таблиц — во вкладке «Данные» под условием.';

const JOIN_NOTE =
  '**Решите через `JOIN … ON`**, а не вложенным запросом: решение без `JOIN` не засчитывается.';

const DEFINITIONS = [
  {
    id: 'keys-1',
    title: 'Первичный ключ: таблица преподавателей',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'В колледже появились преподаватели. Создайте таблицу `teachers` со столбцами:\n' +
      '- `id INTEGER PRIMARY KEY` — **первичный ключ**: уникальный номер каждой строки, по нему на преподавателя будут ссылаться другие таблицы;\n' +
      '- `name TEXT NOT NULL` — имя преподавателя, пустым быть не может.',
    schemaSql: BASE,
    allowedStatement: 'CREATE TABLE',
    checkType: 'state_check',
    checkerSql: structureChecker('teachers'),
    solution: 'CREATE TABLE teachers (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
  },
  {
    id: 'keys-2',
    title: 'Первичный ключ не повторяется',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'Добавьте в таблицу `groups` новую группу **DB-23**.\n\n' +
      'В `groups.id` уже заняты номера `1` и `2`. Первичный ключ не может повторяться: если указать занятый `id`, база выдаст ошибку `UNIQUE constraint failed: groups.id`. ' +
      'Укажите свободный номер `3` или не указывайте `id` совсем — SQLite сам выдаст следующий свободный номер.',
    schemaSql: `${BASE}${TEACHERS}`,
    allowedStatement: 'INSERT',
    checkType: 'state_check',
    checkerSql: 'SELECT id, name FROM groups ORDER BY id',
    solution: "INSERT INTO groups (name) VALUES ('DB-23')",
  },
  {
    id: 'keys-3',
    title: 'Внешний ключ: у курса есть преподаватель',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'Каждый курс ведёт один преподаватель, а один преподаватель может вести несколько курсов (связь «один ко многим»). Ссылка хранится у «многих» — в курсе.\n\n' +
      'Создайте таблицу `courses` со столбцами:\n' +
      '- `id INTEGER PRIMARY KEY`\n' +
      '- `title TEXT NOT NULL` — название курса\n' +
      '- `teacher_id INTEGER` — **внешний ключ** на `teachers(id)`: `REFERENCES teachers(id)`. Без `NOT NULL`: у нового курса преподавателя может ещё не быть.',
    schemaSql: `${BASE}${TEACHERS}`,
    allowedStatement: 'CREATE TABLE',
    checkType: 'state_check',
    checkerSql: structureChecker('courses'),
    solution:
      'CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL, teacher_id INTEGER REFERENCES teachers(id))',
  },
  {
    id: 'keys-4',
    title: 'Внешний ключ: назначить преподавателя',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'У курса **Python** пока нет преподавателя (`teacher_id` пустой). Назначьте ему преподавателя **Бахтиёра Рахимова**.\n\n' +
      'Во внешний ключ пишется не имя, а **`id` преподавателя** — найдите его в таблице `teachers` во вкладке «Данные». ' +
      'Проверка внешних ключей включена: если указать несуществующий `id`, база выдаст ошибку `FOREIGN KEY constraint failed`.\n\n' +
      TABLES_NOTE,
    schemaSql: BEFORE_ASSIGN,
    allowedStatement: 'UPDATE',
    checkType: 'state_check',
    checkerSql: 'SELECT id, title, teacher_id FROM courses ORDER BY id',
    solution: "UPDATE courses SET teacher_id = 2 WHERE title = 'Python'",
  },
  {
    id: 'keys-5',
    title: 'JOIN: курсы и их преподаватели',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'Выведите каждый курс вместе с именем его преподавателя. Столбцы результата: `course` (название курса) и `teacher` (имя преподавателя).\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказка: `FROM courses c JOIN teachers t ON c.teacher_id = t.id`, столбцы переименуйте через `AS`. ' +
      'Курс без преподавателя («Алгоритмы») в результат не попадёт — так работает обычный `JOIN`: строки без пары отбрасываются.\n\n' +
      TABLES_NOTE,
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    solution: 'SELECT c.title AS course, t.name AS teacher FROM courses c JOIN teachers t ON c.teacher_id = t.id',
  },
  {
    id: 'keys-6',
    title: 'JOIN + WHERE: курсы одного преподавателя',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'Выведите столбец `title` — названия всех курсов, которые ведёт **Бахтиёр Рахимов**.\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказка: соедините `courses` и `teachers` условием `courses.teacher_id = teachers.id`, а преподавателя отберите в `WHERE` **по имени** (`teachers.name = ...`), а не по числу `teacher_id`.\n\n' +
      TABLES_NOTE,
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    solution:
      "SELECT c.title FROM courses c JOIN teachers t ON c.teacher_id = t.id WHERE t.name = 'Бахтиёр Рахимов'",
  },
  {
    id: 'keys-7',
    title: 'LEFT JOIN + GROUP BY: нагрузка преподавателей',
    descriptionMd:
      '**Уровень:** среднее.\n\n' +
      'Посчитайте, сколько курсов ведёт каждый преподаватель. Столбцы: `teacher` и `courses_count`. ' +
      'В результате должны быть **все три** преподавателя — у Ольги Ким `0`. Отсортируйте по `courses_count` по убыванию. Порядок строк проверяется.\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказки:\n' +
      '- обычный `JOIN` потеряет преподавателя без курсов, поэтому нужен `FROM teachers t LEFT JOIN courses c ON c.teacher_id = t.id`;\n' +
      '- группируйте по преподавателю: `GROUP BY t.id, t.name`;\n' +
      '- считайте `COUNT(c.id)`, а не `COUNT(*)`: `COUNT(*)` даст Ольге Ким `1`;\n' +
      '- сортировка: `ORDER BY courses_count DESC`.',
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    orderMatters: true,
    solution:
      'SELECT t.name AS teacher, COUNT(c.id) AS courses_count FROM teachers t LEFT JOIN courses c ON c.teacher_id = t.id GROUP BY t.id, t.name ORDER BY courses_count DESC',
  },
  {
    id: 'keys-8',
    title: 'JOIN четырёх таблиц: ученики преподавателя',
    descriptionMd:
      '**Уровень:** среднее.\n\n' +
      'Выведите столбец `name` — имена всех студентов, которые учатся у **Бахтиёра Рахимова** (на любом его курсе). ' +
      'Каждое имя — **один раз**, по алфавиту. Порядок строк проверяется.\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказки:\n' +
      '- цепочка связей: `students` → `enrollments` (по `student_id`) → `courses` (по `course_id`) → `teachers` (по `teacher_id`), это три `JOIN … ON`;\n' +
      '- преподавателя отберите в `WHERE t.name = ...`;\n' +
      '- Рахимов ведёт два курса, и некоторые студенты записаны на оба — уберите повторы через `SELECT DISTINCT`;\n' +
      '- сортировка: `ORDER BY s.name`.\n\n' +
      TABLES_NOTE,
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    orderMatters: true,
    solution:
      "SELECT DISTINCT s.name FROM students s JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id JOIN teachers t ON t.id = c.teacher_id WHERE t.name = 'Бахтиёр Рахимов' ORDER BY s.name",
  },
  {
    id: 'keys-9',
    title: 'JOIN + WHERE: курсы студентов группы IB-22',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'Выведите студентов группы **IB-22** и курсы, на которые они записаны. Столбцы: `name` (имя студента) и `title` (название курса).\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказки:\n' +
      '- группа нужна для фильтра: `students s JOIN groups g ON g.id = s.group_id`;\n' +
      '- курсы — через таблицу-связку: `JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id`;\n' +
      '- группу отберите в `WHERE` по названию (`g.name = ...`).\n\n' +
      'Студент группы, не записанный ни на один курс, в результат не попадёт — так работает обычный `JOIN`.\n\n' +
      TABLES_NOTE,
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    solution:
      "SELECT s.name, c.title FROM students s JOIN groups g ON g.id = s.group_id JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id WHERE g.name = 'IB-22'",
  },
  {
    id: 'keys-10',
    title: 'LEFT JOIN: курсы без преподавателя',
    descriptionMd:
      '**Уровень:** лёгкое.\n\n' +
      'Найдите курсы, у которых нет преподавателя. Выведите столбец `title`.\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказки:\n' +
      '- `FROM courses c LEFT JOIN teachers t ON t.id = c.teacher_id` — `LEFT JOIN` оставит все курсы, а у курса без пары столбцы `t` будут пустыми (`NULL`);\n' +
      '- оставьте только такие строки: `WHERE t.id IS NULL`;\n' +
      '- обычный `JOIN` здесь не подойдёт: он сразу отбросит курсы без пары, и результат будет пустым.\n\n' +
      TABLES_NOTE,
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    solution: 'SELECT c.title FROM courses c LEFT JOIN teachers t ON t.id = c.teacher_id WHERE t.id IS NULL',
  },
  {
    id: 'keys-11',
    title: 'COUNT(DISTINCT): сколько студентов у каждого преподавателя',
    descriptionMd:
      '**Уровень:** среднее.\n\n' +
      'Посчитайте, сколько **разных** студентов учится у каждого преподавателя (на всех его курсах вместе). Столбцы: `teacher` и `students_count`. ' +
      'В результате должны быть **все три** преподавателя, у Ольги Ким — `0`. Отсортируйте по `students_count` по убыванию. Порядок строк проверяется.\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказки:\n' +
      '- цепочка: `teachers t LEFT JOIN courses c ON c.teacher_id = t.id LEFT JOIN enrollments e ON e.course_id = c.id` — оба соединения `LEFT`, чтобы не потерять Ольгу Ким;\n' +
      '- группируйте по преподавателю: `GROUP BY t.id, t.name`;\n' +
      '- один студент может учиться у преподавателя на двух курсах, поэтому считайте `COUNT(DISTINCT e.student_id)` — без `DISTINCT` такой студент посчитается дважды;\n' +
      '- сортировка: `ORDER BY students_count DESC`.',
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    orderMatters: true,
    solution:
      'SELECT t.name AS teacher, COUNT(DISTINCT e.student_id) AS students_count FROM teachers t LEFT JOIN courses c ON c.teacher_id = t.id LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY t.id, t.name ORDER BY students_count DESC',
  },
  {
    id: 'keys-12',
    title: 'GROUP BY + HAVING: популярные курсы и их преподаватели',
    descriptionMd:
      '**Уровень:** среднее.\n\n' +
      'Выведите курсы, на которые записано **не меньше двух** студентов, вместе с преподавателем и числом студентов. Столбцы: `course`, `teacher`, `students_count`. ' +
      'Отсортируйте по `students_count` по убыванию. Порядок строк проверяется.\n\n' +
      JOIN_NOTE + '\n\n' +
      'Подсказки:\n' +
      '- соедините три таблицы: `courses c JOIN teachers t ON t.id = c.teacher_id JOIN enrollments e ON e.course_id = c.id`;\n' +
      '- группируйте по курсу: `GROUP BY c.id, c.title, t.name`, число студентов — `COUNT(*)`;\n' +
      '- условие на **результат подсчёта** пишется в `HAVING`, а не в `WHERE`: `WHERE` отбирает строки до группировки и не умеет работать с `COUNT`;\n' +
      '- сортировка: `ORDER BY students_count DESC`.\n\n' +
      TABLES_NOTE,
    schemaSql: FULL,
    requiredKeyword: 'JOIN',
    orderMatters: true,
    solution:
      'SELECT c.title AS course, t.name AS teacher, COUNT(*) AS students_count FROM courses c JOIN teachers t ON t.id = c.teacher_id JOIN enrollments e ON e.course_id = c.id GROUP BY c.id, c.title, t.name HAVING COUNT(*) >= 2 ORDER BY students_count DESC',
  },
];

function computeExpected(def) {
  const conn = new Database(':memory:');
  try {
    conn.pragma('foreign_keys = ON');
    conn.exec(def.schemaSql);
    if (!def.checkType) return conn.prepare(def.solution).all();
    conn.prepare(def.solution).run();
    return conn.prepare(def.checkerSql).all();
  } finally {
    conn.close();
  }
}

const exercises = DEFINITIONS.map((def, i) => ({
  id: def.id,
  orderIndex: FIRST_ORDER_INDEX + i,
  topic: 'keys_join',
  title: def.title,
  descriptionMd: def.descriptionMd,
  schemaSql: def.schemaSql,
  allowedStatement: def.allowedStatement || 'SELECT',
  checkType: def.checkType || 'select_match',
  checkerSql: def.checkerSql || null,
  orderMatters: !!def.orderMatters,
  requiredKeyword: def.requiredKeyword || null,
  expectedResult: computeExpected(def),
}));

module.exports = exercises;
module.exports.SOLUTIONS = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d.solution]));
