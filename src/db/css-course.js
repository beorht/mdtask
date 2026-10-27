// DB access for the «Web-разработка: CSS» subject (src/lib/css-course/). Built by index.js with its
// connection and statement cache; the functions are re-exported from there.

function makeCssCourseDb(db, prepared) {
  const now = () => new Date().toISOString();

  function getCssProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM css_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM css_progress').all();
    return rows.map((r) => ({ studentId: r.student_id, itemId: r.item_id, stats: JSON.parse(r.stats), solvedAt: r.solved_at }));
  }

  function saveCssProgress(studentId, itemId, stats) {
    prepared(
      `INSERT INTO css_progress (student_id, item_id, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET stats = excluded.stats, solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, JSON.stringify(stats), stats.solvedAt || null, now());
  }

  function addCssEvent(e) {
    prepared(
      `INSERT INTO css_events (student_id, item_id, type, status, client_status, kind, ms, code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(e.studentId, e.itemId, e.type, e.status || null, e.clientStatus || null, e.kind || null,
      e.ms == null ? null : e.ms, e.code == null ? null : e.code, e.at || now());
  }

  function getCssEvents(studentId, limit = 500) {
    return prepared('SELECT * FROM css_events WHERE student_id = ? ORDER BY id DESC LIMIT ?').all(studentId, limit);
  }

  function resetCssStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM css_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM css_events WHERE student_id = ?').run(studentId);
    })();
  }

  return { getCssProgress, saveCssProgress, addCssEvent, getCssEvents, resetCssStudent };
}

module.exports = { makeCssCourseDb };
