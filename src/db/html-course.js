// DB access for the «Web-разработка: HTML» subject (src/lib/html-course/). Built by index.js with its
// connection and statement cache; the functions are re-exported from there.

function makeHtmlCourseDb(db, prepared) {
  const now = () => new Date().toISOString();

  function getHtmlProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM html_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM html_progress').all();
    return rows.map((r) => ({ studentId: r.student_id, itemId: r.item_id, stats: JSON.parse(r.stats), solvedAt: r.solved_at }));
  }

  function saveHtmlProgress(studentId, itemId, stats) {
    prepared(
      `INSERT INTO html_progress (student_id, item_id, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET stats = excluded.stats, solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, JSON.stringify(stats), stats.solvedAt || null, now());
  }

  function addHtmlEvent(e) {
    prepared(
      `INSERT INTO html_events (student_id, item_id, type, status, client_status, kind, ms, code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(e.studentId, e.itemId, e.type, e.status || null, e.clientStatus || null, e.kind || null,
      e.ms == null ? null : e.ms, e.code == null ? null : e.code, e.at || now());
  }

  function getHtmlEvents(studentId, limit = 500) {
    return prepared('SELECT * FROM html_events WHERE student_id = ? ORDER BY id DESC LIMIT ?').all(studentId, limit);
  }

  function resetHtmlStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM html_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM html_events WHERE student_id = ?').run(studentId);
    })();
  }

  return { getHtmlProgress, saveHtmlProgress, addHtmlEvent, getHtmlEvents, resetHtmlStudent };
}

module.exports = { makeHtmlCourseDb };
