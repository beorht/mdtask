function seed(conn) {
  const { c } = conn.prepare('SELECT COUNT(*) as c FROM users').get();
  if (c > 0) return;

  const insertUser = conn.prepare('INSERT INTO users (id, role, name, student_group) VALUES (?, ?, ?, ?)');
  insertUser.run('student-1', 'student', 'Иван Иванов', 'IT-21');
  insertUser.run('student-2', 'student', 'Мария Петрова', 'IT-21');
  insertUser.run('teacher-1', 'teacher', 'Сергей Смирнов', null);

  const insertCourse = conn.prepare('INSERT INTO courses (id, title, teacher_id) VALUES (?, ?, ?)');
  insertCourse.run('course-1', 'Веб-разработка', 'teacher-1');

  const insertAssignment = conn.prepare(
    'INSERT INTO assignments (id, course_id, title, md_path, target_type, target_student_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertAssignment.run('assign-1', 'course-1', 'Задание 1: Настройка репозитория', 'section-1/task-1.md', 'group', null, '2026-09-20');
  insertAssignment.run('assign-2', 'course-1', 'Задание 2: Ветвление', 'section-1/task-2.md', 'group', null, '2026-09-27');
  insertAssignment.run('assign-3', 'course-1', 'Задание 1: Express-сервер', 'section-2/task-1.md', 'group', null, '2026-10-04');
  insertAssignment.run(
    'assign-4',
    'course-1',
    'Дополнительное задание: Рефакторинг',
    'individual/student-1/extra-task.md',
    'individual',
    'student-1',
    '2026-10-10'
  );

  const insertSubmission = conn.prepare(
    'INSERT INTO submissions (id, assignment_id, student_id, files, status, comment, submitted_at, checked_at, parent_submission_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertSubmission.run('sub-1', 'assign-1', 'student-1', JSON.stringify(['solution.zip']), 'pending', null, '2026-09-10T00:00:00.000Z', null, null);
  insertSubmission.run(
    'sub-2',
    'assign-2',
    'student-1',
    JSON.stringify(['v1.zip']),
    'not_done',
    'Не хватает merge в main',
    '2026-09-14T00:00:00.000Z',
    '2026-09-15T10:00:00.000Z',
    null
  );
  insertSubmission.run('sub-3', 'assign-2', 'student-1', JSON.stringify(['v2.zip']), 'pending', null, '2026-09-16T00:00:00.000Z', null, 'sub-2');
}

module.exports = { seed };
