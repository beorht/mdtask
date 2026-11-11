// DB access for the «Linux Terminal Trainer» subject (src/lib/linux-course/). Built by index.js with its
// connection and statement cache; the functions are re-exported from there.

function makeLinuxCourseDb(db, prepared) {
  const now = () => new Date().toISOString();

  function getLinuxProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM linux_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM linux_progress').all();
    return rows.map((r) => ({ studentId: r.student_id, itemId: r.item_id, stats: JSON.parse(r.stats), solvedAt: r.solved_at }));
  }

  function saveLinuxProgress(studentId, itemId, stats) {
    prepared(
      `INSERT INTO linux_progress (student_id, item_id, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET stats = excluded.stats, solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, JSON.stringify(stats), stats.solvedAt || null, now());
  }

  function addLinuxEvent(e) {
    prepared(
      'INSERT INTO linux_events (student_id, item_id, type, solved, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(e.studentId, e.itemId, e.type, e.solved ? 1 : 0, e.at || now());
  }

  function getLinuxEvents(studentId, limit = 500) {
    return prepared('SELECT * FROM linux_events WHERE student_id = ? ORDER BY id DESC LIMIT ?').all(studentId, limit);
  }

  function resetLinuxStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM linux_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM linux_events WHERE student_id = ?').run(studentId);
    })();
  }

  // Время открытия практической работы «Терминал» (строка id='practical-terminal') или null.
  function getLinuxPracticalOpen() {
    const row = prepared("SELECT opens_at FROM linux_practical_window WHERE id = 'practical-terminal'").get();
    return row ? row.opens_at : null;
  }
  function setLinuxPracticalOpen(opensAt) {
    prepared(
      "INSERT INTO linux_practical_window (id, opens_at) VALUES ('practical-terminal', ?) " +
        'ON CONFLICT(id) DO UPDATE SET opens_at = excluded.opens_at'
    ).run(opensAt || null);
  }
  function clearLinuxPracticalOpen() {
    prepared("DELETE FROM linux_practical_window WHERE id = 'practical-terminal'").run();
  }

  return {
    getLinuxProgress, saveLinuxProgress, addLinuxEvent, getLinuxEvents, resetLinuxStudent,
    getLinuxPracticalOpen, setLinuxPracticalOpen, clearLinuxPracticalOpen,
  };
}

module.exports = { makeLinuxCourseDb };
