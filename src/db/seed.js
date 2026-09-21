const { DEFAULT_PASSWORD, hashPassword } = require('../lib/password');

function seed(conn) {
  const { c } = conn.prepare('SELECT COUNT(*) as c FROM users').get();
  if (c > 0) return;

  // Dev/test fixtures are treated as already-onboarded accounts (no forced
  // password change), unlike real migrated accounts — see db/index.js.
  const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
  const insertUser = conn.prepare(
    'INSERT INTO users (id, role, name, student_group, password_hash, password_salt, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 0)'
  );
  insertUser.run('student-1', 'student', 'Иван Иванов', 'IT-21', hash, salt);
  insertUser.run('student-2', 'student', 'Мария Петрова', 'IT-21', hash, salt);
  insertUser.run('student-3', 'student', 'Алексей Кузнецов', 'IT-21', hash, salt);
  insertUser.run('student-4', 'student', 'Екатерина Соколова', 'IT-21', hash, salt);
  insertUser.run('student-5', 'student', 'Дмитрий Новиков', 'IT-22', hash, salt);
  insertUser.run('student-6', 'student', 'Ольга Морозова', 'IT-22', hash, salt);
  insertUser.run('student-7', 'student', 'Артём Волков', 'IT-22', hash, salt);
  insertUser.run('student-8', 'student', 'Шахзода Каримова', 'IB', hash, salt);
  insertUser.run('teacher-1', 'teacher', 'Сергей Смирнов', null, hash, salt);

  const insertCourse = conn.prepare('INSERT INTO courses (id, title, teacher_id) VALUES (?, ?, ?)');
  insertCourse.run('course-1', 'Веб-разработка', 'teacher-1');
}

module.exports = { seed };
