// DB access for the Emmet trainer (src/lib/emmet/). Built by index.js with its connection and
// statement cache; the functions are re-exported from there.

function makeEmmetDb(db, prepared) {
  const now = () => new Date().toISOString();

  function getEmmetAssignment(studentId) {
    const row = prepared('SELECT ids FROM emmet_assignments WHERE student_id = ?').get(studentId);
    return row ? JSON.parse(row.ids) : null;
  }

  function setEmmetAssignment(studentId, ids) {
    prepared(
      'INSERT INTO emmet_assignments (student_id, ids, created_at) VALUES (?, ?, ?) ON CONFLICT(student_id) DO UPDATE SET ids = excluded.ids, created_at = excluded.created_at'
    ).run(studentId, JSON.stringify(ids), now());
  }

  function getEmmetAssignments() {
    return new Map(prepared('SELECT student_id, ids FROM emmet_assignments').all().map((r) => [r.student_id, JSON.parse(r.ids)]));
  }

  function getEmmetProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM emmet_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM emmet_progress').all();
    return rows.map((r) => ({ studentId: r.student_id, exerciseId: r.exercise_id, stats: JSON.parse(r.stats), solvedAt: r.solved_at }));
  }

  function saveEmmetProgress(studentId, exerciseId, stats) {
    prepared(
      `INSERT INTO emmet_progress (student_id, exercise_id, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(student_id, exercise_id) DO UPDATE SET stats = excluded.stats, solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, exerciseId, JSON.stringify(stats), stats.solvedAt || null, now());
  }

  function addEmmetEvent(e) {
    prepared(
      `INSERT INTO emmet_events (student_id, exercise_id, type, status, client_status, handwritten, kind, ms, code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(e.studentId, e.exerciseId, e.type, e.status || null, e.clientStatus || null, e.handwritten ? 1 : 0, e.kind || null,
      e.ms == null ? null : e.ms, e.code == null ? null : e.code, e.at || now());
  }

  function getEmmetEvents(studentId, limit = 500) {
    return prepared('SELECT * FROM emmet_events WHERE student_id = ? ORDER BY id DESC LIMIT ?').all(studentId, limit);
  }

  // Reset keeps the issued set of exercises (as in EmmetEmulator).
  function resetEmmetStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM emmet_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM emmet_events WHERE student_id = ?').run(studentId);
    })();
  }

  function getEmmetSessionClosedAt(group) {
    const row = prepared('SELECT closed_at FROM emmet_sessions WHERE student_group = ?').get(group || '');
    return row ? row.closed_at : null;
  }

  function setEmmetSessionClosed(group, closed) {
    prepared(
      'INSERT INTO emmet_sessions (student_group, closed_at) VALUES (?, ?) ON CONFLICT(student_group) DO UPDATE SET closed_at = excluded.closed_at'
    ).run(group || '', closed ? now() : null);
  }

  return {
    getEmmetAssignment,
    setEmmetAssignment,
    getEmmetAssignments,
    getEmmetProgress,
    saveEmmetProgress,
    addEmmetEvent,
    getEmmetEvents,
    resetEmmetStudent,
    getEmmetSessionClosedAt,
    setEmmetSessionClosed,
  };
}

module.exports = { makeEmmetDb };
