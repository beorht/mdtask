// DB-доступ предмета «Bash: скрипты в Linux» (src/lib/bash-course/). Собирается index.js с его соединением и
// кэшем подготовленных запросов; функции реэкспортируются оттуда.

function makeBashCourseDb(db, prepared) {
  const now = () => new Date().toISOString();
  const toRow = (r) => ({ studentId: r.student_id, itemId: r.item_id, draft: r.draft, stats: JSON.parse(r.stats || '{}'), lastChoice: r.last_choice, solvedAt: r.solved_at, updatedAt: r.updated_at });

  function getBashCourseProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM bash_course_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM bash_course_progress').all();
    return rows.map(toRow);
  }

  function saveBashCourseItem(studentId, itemId, { draft, stats, solvedAt, lastChoice }) {
    prepared(
      `INSERT INTO bash_course_progress (student_id, item_id, draft, stats, last_choice, solved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET draft = excluded.draft, stats = excluded.stats,
         last_choice = excluded.last_choice, solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, draft ?? null, JSON.stringify(stats || {}), lastChoice ?? null, solvedAt || null, now());
  }

  function addBashCourseAttempt(studentId, taskId, { code, passed, total, forbidden, results }) {
    prepared(
      `INSERT INTO bash_course_attempts (student_id, task_id, code, passed, total, forbidden, results, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(studentId, taskId, code, passed, total, JSON.stringify(forbidden || []), JSON.stringify(results || []), now());
  }

  function addBashQuizAttempt(studentId, questionId, { choice, correct }) {
    prepared('INSERT INTO bash_quiz_attempts (student_id, question_id, choice, correct, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(studentId, questionId, choice, correct ? 1 : 0, now());
  }

  function getBashCourseAttempts(studentId, taskId, limit = 50) {
    return prepared('SELECT * FROM bash_course_attempts WHERE student_id = ? AND task_id = ? ORDER BY id DESC LIMIT ?')
      .all(studentId, taskId, limit)
      .map((r) => ({ id: r.id, code: r.code, passed: r.passed, total: r.total, forbidden: JSON.parse(r.forbidden), results: JSON.parse(r.results), createdAt: r.created_at }));
  }

  function resetBashCourseStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM bash_course_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM bash_course_attempts WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM bash_quiz_attempts WHERE student_id = ?').run(studentId);
    })();
  }

  return { getBashCourseProgress, saveBashCourseItem, addBashCourseAttempt, addBashQuizAttempt, getBashCourseAttempts, resetBashCourseStudent };
}

module.exports = { makeBashCourseDb };
