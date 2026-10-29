// DB access for the JavaScript course (src/lib/js-course/). Built by index.js with its connection
// and statement cache; the functions are re-exported from there.

function makeJsCourseDb(db, prepared) {
  const now = () => new Date().toISOString();
  const toRow = (r) => ({ studentId: r.student_id, itemId: r.item_id, draft: r.draft, stats: JSON.parse(r.stats || '{}'), solvedAt: r.solved_at, updatedAt: r.updated_at });

  function getJsCourseProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM js_course_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM js_course_progress').all();
    return rows.map(toRow);
  }

  function saveJsCourseItem(studentId, itemId, { draft, stats, solvedAt }) {
    prepared(
      `INSERT INTO js_course_progress (student_id, item_id, draft, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET draft = excluded.draft, stats = excluded.stats,
         solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, draft ?? null, JSON.stringify(stats || {}), solvedAt || null, now());
  }

  function addJsCourseAttempt(studentId, taskId, { code, passed, total, forbidden, results }) {
    prepared(
      `INSERT INTO js_course_attempts (student_id, task_id, code, passed, total, forbidden, results, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(studentId, taskId, code, passed, total, JSON.stringify(forbidden || []), JSON.stringify(results || []), now());
  }

  function getJsCourseAttempts(studentId, taskId, limit = 50) {
    return prepared('SELECT * FROM js_course_attempts WHERE student_id = ? AND task_id = ? ORDER BY id DESC LIMIT ?')
      .all(studentId, taskId, limit)
      .map((r) => ({ id: r.id, code: r.code, passed: r.passed, total: r.total, forbidden: JSON.parse(r.forbidden), results: JSON.parse(r.results), createdAt: r.created_at }));
  }

  function resetJsCourseStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM js_course_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM js_course_attempts WHERE student_id = ?').run(studentId);
    })();
  }

  return { getJsCourseProgress, saveJsCourseItem, addJsCourseAttempt, getJsCourseAttempts, resetJsCourseStudent };
}

module.exports = { makeJsCourseDb };
