// Issues the individual editor assignment «Учёт библиотеки: анализ выдачи книг» to students.
// Text only: the statement (statement.md) with the student's own data tables from
// generate.py, and empty editor files — students write all the code themselves. The teacher's
// expected values go to data/teacher/library-analysis/<student>.md.
//
//   DB_PATH=./data/mdtask.db node scripts/library-analysis/issue.js --due 2026-10-29 st-ib-125 st-ib-601
//
// A student who already has an assignment with this title is skipped.
const path = require('path');
const { execFileSync } = require('child_process');
const db = require('../../src/db');
const { createAssignmentWithContent } = require('../../src/lib/assignment-content');

const GENERATOR = path.join(__dirname, 'generate.py');
const TITLE = 'Учёт библиотеки: анализ выдачи книг на Python и SQLite';
const COURSE_ID = 'course-1';
const CODE_FILES = ['main.py', 'library_db.py', 'analysis.py'];
const EXPECTED_DIR = path.join(__dirname, '..', '..', 'data', 'teacher', 'library-analysis');

function main(argv) {
  const dueIndex = argv.indexOf('--due');
  if (dueIndex === -1 || !/^\d{4}-\d{2}-\d{2}$/.test(argv[dueIndex + 1] || '')) {
    throw new Error('укажите срок: --due ГГГГ-ММ-ДД');
  }
  const dueDate = argv[dueIndex + 1];
  const students = argv.filter((a, i) => i !== dueIndex && i !== dueIndex + 1);
  if (!students.length) throw new Error('укажите ID студентов');

  const users = new Map(db.getUsers().map((u) => [u.id, u]));
  const existing = db.getAssignments();
  for (const studentId of students) {
    const user = users.get(studentId);
    if (!user || user.role !== 'student') throw new Error(`нет студента ${studentId}`);
    if (existing.some((a) => a.targetStudentId === studentId && a.title === TITLE)) {
      console.log(`${studentId}: уже выдано, пропускаю`);
      continue;
    }
    const markdown = execFileSync('python3', [GENERATOR, '--statement', studentId], { encoding: 'utf-8' });
    const assignment = createAssignmentWithContent(
      COURSE_ID,
      { title: TITLE, dueDate, targetType: 'individual', targetStudentId: studentId },
      markdown
    );
    db.setAssignmentCodeFiles(assignment.id, CODE_FILES);
    console.log(`${studentId} (${user.name}): выдано ${assignment.id}, срок ${dueDate}`);
  }
  execFileSync('python3', [GENERATOR, '--out', EXPECTED_DIR, ...students], { stdio: 'inherit' });
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
}
