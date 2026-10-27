// DB access for the «Начальный Python» course (src/lib/python-course/). Built by index.js with its connection
// and statement cache; the functions are re-exported from there.

function makePythonCourseDb(db, prepared) {
  const now = () => new Date().toISOString();
  const toRow = (r) => ({ studentId: r.student_id, itemId: r.item_id, draft: r.draft, stats: JSON.parse(r.stats || '{}'), solvedAt: r.solved_at, updatedAt: r.updated_at });

  function getPythonCourseProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM python_course_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM python_course_progress').all();
    return rows.map(toRow);
  }

  function savePythonCourseItem(studentId, itemId, { draft, stats, solvedAt }) {
    prepared(
      `INSERT INTO python_course_progress (student_id, item_id, draft, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET draft = excluded.draft, stats = excluded.stats,
         solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, draft ?? null, JSON.stringify(stats || {}), solvedAt || null, now());
  }

  function addPythonCourseAttempt(studentId, taskId, { code, passed, total, forbidden, results }) {
    prepared(
      `INSERT INTO python_course_attempts (student_id, task_id, code, passed, total, forbidden, results, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(studentId, taskId, code, passed, total, JSON.stringify(forbidden || []), JSON.stringify(results || []), now());
  }

  function getPythonCourseAttempts(studentId, taskId, limit = 50) {
    return prepared('SELECT * FROM python_course_attempts WHERE student_id = ? AND task_id = ? ORDER BY id DESC LIMIT ?')
      .all(studentId, taskId, limit)
      .map((r) => ({ id: r.id, code: r.code, passed: r.passed, total: r.total, forbidden: JSON.parse(r.forbidden), results: JSON.parse(r.results), createdAt: r.created_at }));
  }

  function resetPythonCourseStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM python_course_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM python_course_attempts WHERE student_id = ?').run(studentId);
    })();
  }

  return { getPythonCourseProgress, savePythonCourseItem, addPythonCourseAttempt, getPythonCourseAttempts, resetPythonCourseStudent };
}

module.exports = { makePythonCourseDb };
