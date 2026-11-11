// DB-доступ к средней контрольной ИБ (таблица ib_mid_progress, см. schema.sql).
// Собирается в index.js с подключением и кэшем запросов; функции реэкспортируются оттуда.

function makeIbMidDb(db, prepared) {
  const now = () => new Date().toISOString();

  function rowToMid(row) {
    if (!row) return null;
    return {
      ...row,
      result: row.result ? JSON.parse(row.result) : null,
      locked: !!row.locked,
    };
  }

  // Прогресс одного студента по всем заданиям контрольной.
  function getMidProgress(studentId) {
    return prepared('SELECT * FROM ib_mid_progress WHERE student_id = ?').all(studentId).map(rowToMid);
  }

  // Прогресс по одному заданию студента (или null).
  function getMidTask(studentId, taskId) {
    return rowToMid(prepared('SELECT * FROM ib_mid_progress WHERE student_id = ? AND task_id = ?').get(studentId, taskId));
  }

  // Весь прогресс (для админ-матрицы): student_id, task_id, status, score, submitted_at, locked.
  function getAllMidProgress() {
    return prepared(
      'SELECT student_id, task_id, status, runs, score, submitted_at, locked FROM ib_mid_progress'
    ).all().map((r) => ({ ...r, locked: !!r.locked }));
  }

  // Автосохранение черновика/ответа (не меняет статус сдачи и не трогает заблокированные задания).
  function saveMidDraft(studentId, taskId, { draft = null, answer = null } = {}) {
    prepared(
      `INSERT INTO ib_mid_progress (student_id, task_id, status, draft, answer, updated_at)
       VALUES (?, ?, 'in_progress', ?, ?, ?)
       ON CONFLICT(student_id, task_id) DO UPDATE SET
         draft = excluded.draft, answer = excluded.answer, updated_at = excluded.updated_at
       WHERE ib_mid_progress.locked = 0`
    ).run(studentId, taskId, draft, answer, now());
  }

  // Зафиксировать запуск кода (блок C: инкремент runs; при достижении лимита вызывающий сам сдаёт).
  function bumpMidRuns(studentId, taskId) {
    prepared(
      `INSERT INTO ib_mid_progress (student_id, task_id, status, runs, updated_at)
       VALUES (?, ?, 'in_progress', 1, ?)
       ON CONFLICT(student_id, task_id) DO UPDATE SET runs = ib_mid_progress.runs + 1, updated_at = excluded.updated_at
       WHERE ib_mid_progress.locked = 0`
    ).run(studentId, taskId, now());
    const r = prepared('SELECT runs FROM ib_mid_progress WHERE student_id = ? AND task_id = ?').get(studentId, taskId);
    return r ? r.runs : 0;
  }

  // Сдать задание: фиксирует status/result/код, блокирует (менять нельзя), ставит время сдачи.
  function submitMidTask(studentId, taskId, { status = 'submitted', draft = null, answer = null, result = null } = {}) {
    prepared(
      `INSERT INTO ib_mid_progress (student_id, task_id, status, draft, answer, result, locked, submitted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(student_id, task_id) DO UPDATE SET
         status = excluded.status,
         draft = COALESCE(excluded.draft, ib_mid_progress.draft),
         answer = COALESCE(excluded.answer, ib_mid_progress.answer),
         result = excluded.result, locked = 1,
         submitted_at = COALESCE(ib_mid_progress.submitted_at, excluded.submitted_at),
         updated_at = excluded.updated_at`
    ).run(studentId, taskId, status, draft, answer, result ? JSON.stringify(result) : null, now(), now());
  }

  // Оценка преподавателя.
  function setMidScore(studentId, taskId, score) {
    prepared(
      `INSERT INTO ib_mid_progress (student_id, task_id, status, score, updated_at)
       VALUES (?, ?, 'in_progress', ?, ?)
       ON CONFLICT(student_id, task_id) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`
    ).run(studentId, taskId, score, now());
  }

  // Сброс задания студента (админ): снимает блокировку и прогресс.
  function resetMidTask(studentId, taskId) {
    prepared('DELETE FROM ib_mid_progress WHERE student_id = ? AND task_id = ?').run(studentId, taskId);
  }

  // Записать результат проверки без блокировки (блок B — перепроверяемые задачи). Черновик сохраняется.
  function recordMidCheck(studentId, taskId, { status = 'in_progress', result = null, draft = null } = {}) {
    prepared(
      `INSERT INTO ib_mid_progress (student_id, task_id, status, draft, result, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, task_id) DO UPDATE SET
         status = excluded.status,
         draft = COALESCE(excluded.draft, ib_mid_progress.draft),
         result = excluded.result,
         updated_at = excluded.updated_at`
    ).run(studentId, taskId, status, draft, result ? JSON.stringify(result) : null, now());
  }

  // Окно проведения ИБ-контрольной (строка id='ib-mid-1'), или null если не назначена.
  function getMidWindow() {
    return prepared("SELECT starts_at, ends_at FROM ib_mid_window WHERE id = 'ib-mid-1'").get() || null;
  }
  function setMidWindow(startsAt, endsAt) {
    prepared(
      "INSERT INTO ib_mid_window (id, starts_at, ends_at) VALUES ('ib-mid-1', ?, ?) " +
        'ON CONFLICT(id) DO UPDATE SET starts_at = excluded.starts_at, ends_at = excluded.ends_at'
    ).run(startsAt || null, endsAt || null);
  }
  function clearMidWindow() {
    prepared("DELETE FROM ib_mid_window WHERE id = 'ib-mid-1'").run();
  }

  return {
    getMidProgress,
    getMidTask,
    getAllMidProgress,
    saveMidDraft,
    bumpMidRuns,
    submitMidTask,
    setMidScore,
    resetMidTask,
    recordMidCheck,
    getMidWindow,
    setMidWindow,
    clearMidWindow,
  };
}

module.exports = { makeIbMidDb };
