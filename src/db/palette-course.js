// DB-доступ предмета «Цвет и палитра» (src/lib/palette-course/). Собирается index.js с его соединением и
// кэшем подготовленных запросов; функции реэкспортируются оттуда. item_id: '<тема>:theory' | id задачи.
function makePaletteCourseDb(db, prepared) {
  const now = () => new Date().toISOString();
  const toRow = (r) => ({ studentId: r.student_id, itemId: r.item_id, draft: r.draft, stats: JSON.parse(r.stats || '{}'), solvedAt: r.solved_at, updatedAt: r.updated_at });

  function getPaletteProgress(studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM palette_progress WHERE student_id = ?').all(studentId)
      : prepared('SELECT * FROM palette_progress').all();
    return rows.map(toRow);
  }

  function savePaletteItem(studentId, itemId, { draft, stats, solvedAt }) {
    prepared(
      `INSERT INTO palette_progress (student_id, item_id, draft, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, item_id) DO UPDATE SET draft = excluded.draft, stats = excluded.stats,
         solved_at = excluded.solved_at, updated_at = excluded.updated_at`
    ).run(studentId, itemId, draft ?? null, JSON.stringify(stats || {}), solvedAt || null, now());
  }

  function addPaletteAttempt(studentId, taskId, { code, passed, total, success }) {
    prepared(
      `INSERT INTO palette_attempts (student_id, task_id, code, passed, total, success, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(studentId, taskId, code, passed, total, success ? 1 : 0, now());
  }

  function getPaletteAttempts(studentId, taskId, limit = 50) {
    return prepared('SELECT * FROM palette_attempts WHERE student_id = ? AND task_id = ? ORDER BY id DESC LIMIT ?')
      .all(studentId, taskId, limit)
      .map((r) => ({ id: r.id, code: r.code, passed: r.passed, total: r.total, success: !!r.success, createdAt: r.created_at }));
  }

  function resetPaletteStudent(studentId) {
    db.transaction(() => {
      prepared('DELETE FROM palette_progress WHERE student_id = ?').run(studentId);
      prepared('DELETE FROM palette_attempts WHERE student_id = ?').run(studentId);
    })();
  }

  return { getPaletteProgress, savePaletteItem, addPaletteAttempt, getPaletteAttempts, resetPaletteStudent };
}

module.exports = { makePaletteCourseDb };
