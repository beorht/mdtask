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

// structureChecker plus `on_delete`: what happens to the row when the referenced row is deleted.
function structureWithOnDeleteChecker(table) {
  return `SELECT p.name, UPPER(p.type) AS type, p."notnull" AS not_null, p.pk,
  f."table" AS ref_table,
  COALESCE(f."to", CASE WHEN f."table" IS NOT NULL THEN 'id' END) AS ref_column,
  UPPER(f.on_delete) AS on_delete
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

// The college database with ON DELETE CASCADE on the enrollments links (exercise 19).
const SCHOOL_SCHEMA_CASCADE = `${STUDENTS_AND_COURSES}
INSERT INTO courses (id, title) VALUES (4, 'Алгоритмы');
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
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

// A shop for exercise 21: a new subject area, so the chain of keys isn't solved from memory.
const SHOP_SCHEMA = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  price INTEGER NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  created_at TEXT NOT NULL
);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO customers (id, name) VALUES
  (1, 'Азиз'),
  (2, 'Нигора'),
  (3, 'Рустам');
INSERT INTO products (id, title, price) VALUES
  (1, 'Ноутбук', 9500000),
  (2, 'Мышь', 120000),
  (3, 'Клавиатура', 350000),
  (4, 'Монитор', 2400000),
  (5, 'Наушники', 450000);
INSERT INTO orders (id, customer_id, created_at) VALUES
  (1, 1, '2026-10-01'),
  (2, 2, '2026-10-02'),
  (3, 1, '2026-10-05'),
  (4, 3, '2026-10-06');
INSERT INTO order_items (order_id, product_id, quantity) VALUES
  (1, 1, 1),
  (1, 2, 1),
  (2, 4, 2),
  (3, 3, 1),
  (3, 2, 2),
  (4, 5, 1);
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
  // --- Several statements per run (allowedStatements), FOREIGN KEY order, CASCADE, traps ---
  {
    id: 'relations-13',
    title: 'Две связанные таблицы с нуля',
    descriptionMd:
      'База пустая. В этом задании можно написать **несколько операторов подряд**, разделяя их точкой с запятой `;` — они выполнятся по очереди.\n\n' +
      '1. Создайте таблицу `groups`: `id INTEGER PRIMARY KEY`, `name TEXT NOT NULL UNIQUE`.\n' +
      '2. Создайте таблицу `students`: `id INTEGER PRIMARY KEY`, `name TEXT NOT NULL`, `group_id INTEGER NOT NULL` — внешний ключ на `groups(id)`.\n' +
      '3. Добавьте группы **WEB-21** (`id = 1`) и **IB-22** (`id = 2`).\n' +
      '4. Добавьте студентов **Алишер** (`id = 1`, группа WEB-21) и **Севара** (`id = 2`, группа IB-22).\n\n' +
      'Порядок важен: строка в `students` может ссылаться только на группу, которая **уже есть**. Попробуйте сначала добавить студентов — и посмотрите, что ответит база.',
    schemaSql: '',
    allowedStatement: 'INSERT',
    allowedStatements: ['CREATE TABLE', 'INSERT', 'SELECT'],
    checkType: 'state_check',
    checkerSql: `SELECT s.id, s.name, s.group_id, g.name AS group_name, f."table" AS ref_table
FROM students s
JOIN groups g ON g.id = s.group_id
LEFT JOIN pragma_foreign_key_list('students') f ON f."from" = 'group_id'
ORDER BY s.id`,
    solution:
      'CREATE TABLE groups (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);\n' +
      'CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, group_id INTEGER NOT NULL REFERENCES groups(id));\n' +
      "INSERT INTO groups (id, name) VALUES (1, 'WEB-21'), (2, 'IB-22');\n" +
      "INSERT INTO students (id, name, group_id) VALUES (1, 'Алишер', 1), (2, 'Севара', 2);",
  },
  {
    id: 'relations-14',
    title: 'Новая группа и её первый студент',
    descriptionMd:
      'В колледже открылась группа **DS-23**, и в неё зачислена **Камола**. Группы DS-23 в базе ещё нет.\n\n' +
      '- Добавьте группу `DS-23` в `groups` (`id` можно не указывать — база выдаст следующий сама).\n' +
      '- Добавьте студентку `Камола` с `id = 6` в `students` так, чтобы она была в группе DS-23.\n\n' +
      'Можно несколько операторов через `;`. Какой `id` получила новая группа? Его можно посмотреть `SELECT`-ом или взять вложенным запросом прямо в `INSERT`.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'INSERT',
    allowedStatements: ['INSERT', 'SELECT'],
    checkType: 'state_check',
    checkerSql: 'SELECT s.id, s.name, g.name AS group_name FROM students s JOIN groups g ON g.id = s.group_id ORDER BY s.id',
    solution:
      "INSERT INTO groups (name) VALUES ('DS-23');\n" +
      "INSERT INTO students (id, name, group_id) VALUES (6, 'Камола', (SELECT id FROM groups WHERE name = 'DS-23'));",
  },
  {
    id: 'relations-15',
    title: 'Сначала посмотреть, потом записать',
    descriptionMd:
      '**Даниил** хочет учиться на **всех** курсах, на которые он ещё не записан.\n\n' +
      'Не угадывайте `id`! В этом задании можно сначала выполнить `SELECT` (посмотреть `courses` и записи Даниила в `enrollments`), а потом добавить нужные строки в `enrollments` — всё в одном запуске, через `;`. Кнопка «▶ Выполнить» покажет результат последнего `SELECT`.\n\n' +
      'Если попытаться записать Даниила на курс, где он уже есть, база ответит `UNIQUE constraint failed`: составной первичный ключ не пускает дубликаты.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'INSERT',
    allowedStatements: ['SELECT', 'INSERT'],
    checkType: 'state_check',
    checkerSql: 'SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id',
    solution: 'INSERT INTO enrollments (student_id, course_id) VALUES (5, 2), (5, 3), (5, 4)',
  },
  {
    id: 'relations-16',
    title: 'Запись без ошибки о дубликате',
    descriptionMd:
      'Куратор прислал список: записать **Алишера** (`id = 1`), **Мадину** (`id = 2`) и **Тимура** (`id = 3`) на курс **Базы данных** (`id = 2`). Часть из них уже записана — обычный `INSERT` упадёт с `UNIQUE constraint failed`, и не добавится вообще ничего.\n\n' +
      'Напишите **один** запрос, который добавит все три пары, а уже существующие молча пропустит: `INSERT OR IGNORE INTO ...`.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'INSERT',
    requiredKeyword: 'IGNORE',
    checkType: 'state_check',
    checkerSql: 'SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id',
    solution: 'INSERT OR IGNORE INTO enrollments (student_id, course_id) VALUES (1, 2), (2, 2), (3, 2)',
  },
  {
    id: 'relations-17',
    title: 'Расформировать группу',
    descriptionMd:
      'Группу **IB-22** расформировывают: все её студенты переходят в **WEB-21**, а сама группа удаляется из `groups`.\n\n' +
      'Можно несколько операторов через `;` (`UPDATE`, `DELETE`, `SELECT`). Подумайте о порядке: пока в группе есть студенты, внешний ключ не даст её удалить — база ответит `FOREIGN KEY constraint failed`. Студенты при этом удаляться **не должны**.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'DELETE',
    allowedStatements: ['UPDATE', 'DELETE', 'SELECT'],
    checkType: 'state_check',
    checkerSql:
      'SELECT g.id, g.name, COUNT(s.id) AS students_count FROM groups g LEFT JOIN students s ON s.group_id = g.id GROUP BY g.id ORDER BY g.id',
    solution: 'UPDATE students SET group_id = 1 WHERE group_id = 2;\nDELETE FROM groups WHERE id = 2;',
  },
  {
    id: 'relations-18',
    title: 'Каскадное удаление: ON DELETE CASCADE',
    descriptionMd:
      'Создайте таблицу-связку `enrollments`, которая сама очищается, когда удаляют студента или курс:\n' +
      '- `student_id INTEGER NOT NULL` — внешний ключ на `students(id)` с правилом `ON DELETE CASCADE`\n' +
      '- `course_id INTEGER NOT NULL` — внешний ключ на `courses(id)` с правилом `ON DELETE CASCADE`\n' +
      '- `PRIMARY KEY (student_id, course_id)`\n\n' +
      'Без правила база просто не даст удалить студента, у которого есть записи на курсы. С `ON DELETE CASCADE` его записи удалятся вместе с ним.',
    schemaSql: STUDENTS_AND_COURSES,
    allowedStatement: 'CREATE TABLE',
    checkType: 'state_check',
    checkerSql: structureWithOnDeleteChecker('enrollments'),
    solution:
      'CREATE TABLE enrollments (student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE, PRIMARY KEY (student_id, course_id))',
  },
  {
    id: 'relations-19',
    title: 'Что делает CASCADE',
    descriptionMd:
      '**Тимур** (`id = 3`) отчислен. Удалите его из таблицы `students`.\n\n' +
      'В этой базе `enrollments` создана с `ON DELETE CASCADE`. Проверяется таблица `enrollments`: посмотрите в «Ожидаемом результате», какие записи исчезнут **сами**, хотя вы удаляете строку только из `students`.',
    schemaSql: SCHOOL_SCHEMA_CASCADE,
    allowedStatement: 'DELETE',
    checkType: 'state_check',
    checkerSql: 'SELECT student_id, course_id FROM enrollments ORDER BY student_id, course_id',
    solution: 'DELETE FROM students WHERE id = 3',
  },
  {
    id: 'relations-20',
    title: 'Найдите ошибку: пусто, но без ошибки',
    descriptionMd:
      'Этот запрос должен вывести имена студентов курса **Базы данных**, но возвращает **пустой** результат — и при этом база не сообщает ни об одной ошибке:\n\n' +
      '```sql\n' +
      'SELECT name FROM students\n' +
      'WHERE id IN (\n' +
      '  SELECT student_id FROM enrollments\n' +
      '  WHERE course_id = (SELECT id FROM courses WHERE name = \'Базы данных\')\n' +
      ');\n' +
      '```\n\n' +
      'Найдите и исправьте ошибку. Подсказка: откройте вкладку «Структура БД» и проверьте, какие столбцы есть в каждой таблице, к которой обращается запрос. Почему SQLite не выдал `no such column` — узнаете в разборе после решения.',
    schemaSql: SCHOOL_SCHEMA_EXT,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution:
      "SELECT name FROM students WHERE id IN (SELECT student_id FROM enrollments WHERE course_id = (SELECT id FROM courses WHERE title = 'Базы данных'))",
  },
  {
    id: 'relations-21',
    title: 'Магазин: что покупал клиент',
    descriptionMd:
      'Новая база — интернет-магазин: `customers` (клиенты) → `orders` (заказы, у каждого `customer_id`) → `order_items` (строки заказа: `order_id`, `product_id`, `quantity`) ← `products` (товары).\n\n' +
      'Выведите столбец `title` всех товаров, которые хоть раз покупал клиент **Азиз**. Каждый товар — один раз.\n\n' +
      'Пройдите по цепочке ключей вложенными запросами: имя клиента → его `id` → `id` его заказов → `product_id` в строках этих заказов → названия товаров. Сначала посмотрите «Структуру БД»: у клиентов столбец называется `name`, а у товаров — `title`.',
    schemaSql: SHOP_SCHEMA,
    allowedStatement: 'SELECT',
    checkType: 'select_match',
    solution:
      "SELECT title FROM products WHERE id IN (SELECT product_id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = (SELECT id FROM customers WHERE name = 'Азиз')))",
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
  allowedStatements: def.allowedStatements || null,
  requiredKeyword: def.requiredKeyword || null,
  orderMatters: false,
  expectedResult: computeExpected(def),
}));

module.exports = exercises;
module.exports.SOLUTIONS = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d.solution]));
// The same college database is used by the JOIN practice (sql-exercises-join-data.js).
module.exports.SCHOOL_SCHEMA_EXT = SCHOOL_SCHEMA_EXT;
module.exports.structureChecker = structureChecker;
