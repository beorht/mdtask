// Practice for the "JOIN — соединение таблиц" topic (right after "Связи между таблицами"),
// simple level: one JOIN, aliases, JOIN + WHERE / ORDER BY, three tables through the link
// table, LEFT JOIN, JOIN + GROUP BY. Same college database as the relations practice
// and the JOIN theory (src/content/sql-theory-join.js).
//
// Like the relations exercises, each carries a reference `solution`; the expected rows are
// computed from it. Rows are compared together with column names, so every task names the
// result columns (two `name` columns from students and groups would otherwise collide).

const Database = require('better-sqlite3');
const relationsExercises = require('./sql-exercises-relations-data');

const { SCHOOL_SCHEMA_EXT } = relationsExercises;

// Right after the last relations exercise (more of them may be added later).
const FIRST_ORDER_INDEX = relationsExercises[relationsExercises.length - 1].orderIndex + 1;

const DEFINITIONS = [
  {
    id: 'join-1',
    title: 'Студенты и их группы',
    descriptionMd:
      'Выведите каждого студента вместе с названием его группы. Столбцы результата: `name` (имя студента) и `group_name` (название группы).\n\n' +
      'Соедините `students` и `groups` условием `students.group_id = groups.id`. У обеих таблиц есть столбец `name` — укажите таблицу перед именем столбца, а название группы переименуйте через `AS group_name`.',
    solution:
      'SELECT students.name, groups.name AS group_name FROM students JOIN groups ON students.group_id = groups.id',
  },
  {
    id: 'join-2',
    title: 'Студенты группы WEB-21',
    descriptionMd:
      'Выведите столбец `name` всех студентов группы **WEB-21**.\n\n' +
      'В теме «Связи» это решалось вложенным запросом. Теперь соедините `students` с `groups` и отфильтруйте по названию группы в `WHERE`.',
    solution:
      "SELECT students.name FROM students JOIN groups ON students.group_id = groups.id WHERE groups.name = 'WEB-21'",
  },
  {
    id: 'join-3',
    title: 'Псевдонимы и сортировка',
    descriptionMd:
      'Выведите список студентов с группами, **отсортированный по имени студента** по алфавиту. Столбцы: `student` и `group_name`.\n\n' +
      'Дайте таблицам короткие псевдонимы: `FROM students s JOIN groups g ON ...`, и переименуйте оба столбца через `AS`. Порядок строк проверяется.',
    orderMatters: true,
    solution:
      'SELECT s.name AS student, g.name AS group_name FROM students s JOIN groups g ON s.group_id = g.id ORDER BY s.name',
  },
  {
    id: 'join-4',
    title: 'Все записи на курсы',
    descriptionMd:
      'В таблице `enrollments` хранятся только номера. Выведите записи понятно — имя студента и название курса. Столбцы: `name` и `title`.\n\n' +
      'Нужны три таблицы: начните с `enrollments`, присоедините к ней `students` (по `student_id`) и `courses` (по `course_id`) — два `JOIN`, у каждого свой `ON`.',
    solution:
      'SELECT s.name, c.title FROM enrollments e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id',
  },
  {
    id: 'join-5',
    title: 'Кто учится на курсе Python',
    descriptionMd:
      'Выведите столбец `name` студентов, записанных на курс **Python**.\n\n' +
      'Соедините три таблицы, как в прошлой задаче, и добавьте условие на название курса.',
    solution:
      "SELECT s.name FROM enrollments e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id WHERE c.title = 'Python'",
  },
  {
    id: 'join-6',
    title: 'Курсы Алишера',
    descriptionMd:
      'Выведите столбец `title` — названия курсов, на которые записан **Алишер**.\n\n' +
      'Цепочка та же, меняется только условие: теперь фильтруем по имени студента.',
    solution:
      "SELECT c.title FROM enrollments e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id WHERE s.name = 'Алишер'",
  },
  {
    id: 'join-7',
    title: 'Все курсы, даже без студентов',
    descriptionMd:
      'Выведите все курсы вместе с номерами записанных на них студентов. Столбцы: `title` и `student_id`.\n\n' +
      'На курс «Алгоритмы» никто не записан, но он тоже должен попасть в результат — со значением `NULL` в `student_id`. Обычный `JOIN` такую строку потеряет, нужен `LEFT JOIN`. Какая таблица должна стоять слева?',
    solution: 'SELECT c.title, e.student_id FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id',
  },
  {
    id: 'join-8',
    title: 'Студенты без курсов',
    descriptionMd:
      'Найдите студентов, которые **не записаны ни на один курс**. Выведите столбец `name`.\n\n' +
      'Приём из теории: `LEFT JOIN` от `students` к `enrollments`, а затем `WHERE ... IS NULL` — оставить только тех, для кого пары не нашлось.',
    solution:
      'SELECT s.name FROM students s LEFT JOIN enrollments e ON e.student_id = s.id WHERE e.student_id IS NULL',
  },
  {
    id: 'join-9',
    title: 'Сколько студентов в каждой группе',
    descriptionMd:
      'Посчитайте, сколько студентов учится в каждой группе. Столбцы: `group_name` и `students_count`.\n\n' +
      'Соедините `groups` и `students`, затем сгруппируйте по группе и посчитайте строки в каждой.',
    solution:
      'SELECT g.name AS group_name, COUNT(s.id) AS students_count FROM groups g JOIN students s ON s.group_id = g.id GROUP BY g.id, g.name',
  },
  {
    id: 'join-10',
    title: 'Число студентов на каждом курсе',
    descriptionMd:
      'В теме «Связи» мы считали записи по `course_id` — без названий. Теперь выведите **название** каждого курса и число записанных студентов. Столбцы: `title` и `students_count`.\n\n' +
      'В результате должны быть **все четыре** курса, у «Алгоритмов» — `0`. Значит, нужен `LEFT JOIN`, а считать — `COUNT(e.student_id)`, а не `COUNT(*)`.',
    solution:
      'SELECT c.title, COUNT(e.student_id) AS students_count FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.id, c.title',
  },
];

function computeExpected(def) {
  const conn = new Database(':memory:');
  try {
    conn.pragma('foreign_keys = ON');
    conn.exec(SCHOOL_SCHEMA_EXT);
    return conn.prepare(def.solution).all();
  } finally {
    conn.close();
  }
}

const exercises = DEFINITIONS.map((def, i) => ({
  id: def.id,
  orderIndex: FIRST_ORDER_INDEX + i,
  topic: 'join',
  title: def.title,
  descriptionMd: def.descriptionMd,
  schemaSql: SCHOOL_SCHEMA_EXT,
  allowedStatement: 'SELECT',
  checkType: 'select_match',
  checkerSql: null,
  orderMatters: !!def.orderMatters,
  expectedResult: computeExpected(def),
}));

module.exports = exercises;
module.exports.SOLUTIONS = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d.solution]));
