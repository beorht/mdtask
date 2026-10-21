// DB access for the IB final exam (src/lib/exam/). Kept apart from index.js for size; index.js
// builds it with its connection and statement cache and re-exports the functions.

function makeExamDb(db, prepared) {
  const now = () => new Date().toISOString();

  function rowToExam(row) {
    return row && {
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      publishedAt: row.published_at,
      finalizedAt: row.finalized_at,
      deviceMode: row.device_mode || 'block',
      lockPractice: !!row.lock_practice,
      updatedAt: row.updated_at,
    };
  }

  // The stored window, created from the defaults on first use.
  function ensureExam(id, startsAt, endsAt) {
    prepared('INSERT OR IGNORE INTO exams (id, starts_at, ends_at, updated_at) VALUES (?, ?, ?, ?)').run(id, startsAt, endsAt, now());
    return rowToExam(prepared('SELECT * FROM exams WHERE id = ?').get(id));
  }

  // A new window also clears finalized_at, so a moved end finalizes again.
  function setExamWindow(id, startsAt, endsAt) {
    prepared('UPDATE exams SET starts_at = ?, ends_at = ?, finalized_at = NULL, updated_at = ? WHERE id = ?').run(startsAt, endsAt, now(), id);
  }

  function setExamPublished(id, published) {
    prepared('UPDATE exams SET published_at = ?, updated_at = ? WHERE id = ?').run(published ? now() : null, now(), id);
  }

  // The group's other practical work closed until the teacher opens it (src/lib/exam examLockFor).
  function setExamLockPractice(id, locked) {
    prepared('UPDATE exams SET lock_practice = ?, updated_at = ? WHERE id = ?').run(locked ? 1 : 0, now(), id);
  }

  function setExamFinalized(id) {
    prepared('UPDATE exams SET finalized_at = ?, updated_at = ? WHERE id = ?').run(now(), now(), id);
  }

  function rowToVariant(row) {
    return row && {
      examId: row.exam_id,
      studentId: row.student_id,
      theme: row.theme,
      seed: row.seed,
      ...JSON.parse(row.variant),
      anyDevice: !!row.any_device,
      createdAt: row.created_at,
    };
  }

  function getExamVariant(examId, studentId) {
    return rowToVariant(prepared('SELECT * FROM exam_variants WHERE exam_id = ? AND student_id = ?').get(examId, studentId));
  }

  function getExamVariants(examId) {
    return prepared('SELECT * FROM exam_variants WHERE exam_id = ? ORDER BY student_id').all(examId).map(rowToVariant);
  }

  // Replaces the student's variant and forgets their progress on the old one.
  const saveExamVariant = db.transaction((examId, studentId, theme, seed, variant) => {
    prepared('DELETE FROM exam_tasks WHERE exam_id = ? AND student_id = ?').run(examId, studentId);
    prepared(
      `INSERT INTO exam_variants (exam_id, student_id, theme, seed, variant, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (exam_id, student_id) DO UPDATE SET theme = excluded.theme, seed = excluded.seed,
         variant = excluded.variant, created_at = excluded.created_at`
    ).run(examId, studentId, theme, seed, JSON.stringify(variant), now());
  });

  function rowToTask(row) {
    return {
      taskId: row.task_id,
      studentId: row.student_id,
      draft: row.draft,
      attempts: row.attempts,
      runs: row.runs,
      solved: !!row.solved,
      solvedAt: row.solved_at,
      answer: row.answer,
      result: row.result ? JSON.parse(row.result) : null,
      submittedAt: row.submitted_at,
      submitKind: row.submit_kind,
      locked: !!row.locked,
      teacherScore: row.teacher_score,
      updatedAt: row.updated_at,
    };
  }

  // studentId omitted: everyone's rows (admin).
  function getExamTasks(examId, studentId) {
    const rows = studentId
      ? prepared('SELECT * FROM exam_tasks WHERE exam_id = ? AND student_id = ?').all(examId, studentId)
      : prepared('SELECT * FROM exam_tasks WHERE exam_id = ?').all(examId);
    return rows.map(rowToTask);
  }

  function getExamTask(examId, studentId, taskId) {
    const row = prepared('SELECT * FROM exam_tasks WHERE exam_id = ? AND student_id = ? AND task_id = ?').get(examId, studentId, taskId);
    return row ? rowToTask(row) : null;
  }

  function ensureTask(examId, studentId, taskId) {
    prepared('INSERT OR IGNORE INTO exam_tasks (exam_id, student_id, task_id, updated_at) VALUES (?, ?, ?, ?)').run(examId, studentId, taskId, now());
  }

  // Draft of an unlocked task; false if the task is locked.
  function saveExamDraft(examId, studentId, taskId, draft) {
    ensureTask(examId, studentId, taskId);
    const info = prepared('UPDATE exam_tasks SET draft = ?, updated_at = ? WHERE exam_id = ? AND student_id = ? AND task_id = ? AND locked = 0')
      .run(draft, now(), examId, studentId, taskId);
    return info.changes > 0;
  }

  // One check (flag answer, SQL, algorithm): the attempt counter, the last answer and result;
  // a task once solved stays solved and keeps the answer that solved it.
  function recordExamAttempt(examId, studentId, taskId, { answer, result, solved }) {
    ensureTask(examId, studentId, taskId);
    const at = now();
    prepared(
      `UPDATE exam_tasks SET attempts = attempts + 1, answer = CASE WHEN solved = 1 THEN answer ELSE ? END,
         result = CASE WHEN solved = 1 THEN result ELSE ? END, solved = MAX(solved, ?),
         solved_at = COALESCE(solved_at, ?), updated_at = ? WHERE exam_id = ? AND student_id = ? AND task_id = ? AND locked = 0`
    ).run(answer, JSON.stringify(result), solved ? 1 : 0, solved ? at : null, at, examId, studentId, taskId);
  }

  // A run of a bug program: allowed while fewer than `limit` runs were made and the task isn't
  // locked. The last allowed run locks the task with its code as the final answer.
  // -> { allowed, runs, last }
  const takeExamRun = db.transaction((examId, studentId, taskId, limit, code) => {
    ensureTask(examId, studentId, taskId);
    const row = prepared('SELECT runs, locked FROM exam_tasks WHERE exam_id = ? AND student_id = ? AND task_id = ?').get(examId, studentId, taskId);
    if (row.locked || row.runs >= limit) return { allowed: false, runs: row.runs, last: false };
    const runs = row.runs + 1;
    const last = runs >= limit;
    prepared(
      `UPDATE exam_tasks SET runs = ?, draft = ?, locked = ?, answer = CASE WHEN ? THEN ? ELSE answer END,
         submit_kind = CASE WHEN ? THEN 'runs' ELSE submit_kind END, updated_at = ?
       WHERE exam_id = ? AND student_id = ? AND task_id = ?`
    ).run(runs, code, last ? 1 : 0, last ? 1 : 0, code, last ? 1 : 0, now(), examId, studentId, taskId);
    return { allowed: true, runs, last };
  });

  // The single submission of a bug task. kind: manual | runs | timeout. A task locked by its
  // last run accepts only that run's code. -> false if it was already submitted.
  const submitExamTask = db.transaction((examId, studentId, taskId, { code, kind, result, solved }) => {
    ensureTask(examId, studentId, taskId);
    const row = prepared('SELECT * FROM exam_tasks WHERE exam_id = ? AND student_id = ? AND task_id = ?').get(examId, studentId, taskId);
    if (row.submitted_at) return false;
    if (row.locked && row.submit_kind === 'runs' && row.answer !== code) return false;
    const at = now();
    prepared(
      `UPDATE exam_tasks SET answer = ?, draft = ?, result = ?, solved = ?, solved_at = ?, submitted_at = ?,
         submit_kind = ?, locked = 1, attempts = attempts + 1, updated_at = ?
       WHERE exam_id = ? AND student_id = ? AND task_id = ?`
    ).run(code, code, result ? JSON.stringify(result) : null, solved ? 1 : 0, solved ? at : null, at,
      row.submit_kind === 'runs' ? 'runs' : kind, at, examId, studentId, taskId);
    return true;
  });

  // Recheck results (scripts/exam/recheck.py writes the same columns directly).
  function setExamTaskResult(examId, studentId, taskId, result, solved) {
    prepared('UPDATE exam_tasks SET result = ?, solved = ?, solved_at = CASE WHEN ? THEN COALESCE(solved_at, ?) ELSE NULL END, updated_at = ? WHERE exam_id = ? AND student_id = ? AND task_id = ?')
      .run(JSON.stringify(result), solved ? 1 : 0, solved ? 1 : 0, now(), now(), examId, studentId, taskId);
  }

  function setExamTeacherScore(examId, studentId, taskId, score) {
    ensureTask(examId, studentId, taskId);
    prepared('UPDATE exam_tasks SET teacher_score = ?, updated_at = ? WHERE exam_id = ? AND student_id = ? AND task_id = ?')
      .run(score, now(), examId, studentId, taskId);
  }

  // The report: saving keeps it editable; submitting marks it sent (it can be resent until the end).
  function saveExamReport(examId, studentId, taskId, text, submit) {
    ensureTask(examId, studentId, taskId);
    const at = now();
    prepared(
      `UPDATE exam_tasks SET draft = ?, answer = CASE WHEN ? THEN ? ELSE answer END,
         submitted_at = CASE WHEN ? THEN ? ELSE submitted_at END, submit_kind = CASE WHEN ? THEN 'manual' ELSE submit_kind END,
         attempts = attempts + ?, updated_at = ?
       WHERE exam_id = ? AND student_id = ? AND task_id = ? AND locked = 0`
    ).run(text, submit ? 1 : 0, text, submit ? 1 : 0, at, submit ? 1 : 0, submit ? 1 : 0, at, examId, studentId, taskId);
  }

  // After the end: every unsent bug program and report is sent as it is (kind timeout).
  const finalizeExamTasks = db.transaction((examId, bugTaskIds, reportTaskId) => {
    const at = now();
    const variants = prepared('SELECT student_id FROM exam_variants WHERE exam_id = ?').all(examId);
    let sent = 0;
    for (const { student_id: studentId } of variants) {
      for (const taskId of [...bugTaskIds, reportTaskId]) {
        ensureTask(examId, studentId, taskId);
        sent += prepared(
          `UPDATE exam_tasks SET answer = COALESCE(answer, NULLIF(draft, '')), submitted_at = ?, submit_kind = COALESCE(submit_kind, 'timeout'), locked = 1, updated_at = ?
           WHERE exam_id = ? AND student_id = ? AND task_id = ? AND submitted_at IS NULL`
        ).run(at, at, examId, studentId, taskId).changes;
        prepared('UPDATE exam_tasks SET locked = 1 WHERE exam_id = ? AND student_id = ? AND task_id = ?').run(examId, studentId, taskId);
      }
    }
    return sent;
  });

  function setExamDeviceMode(id, mode) {
    prepared('UPDATE exams SET device_mode = ?, updated_at = ? WHERE id = ?').run(mode, now(), id);
  }

  function setExamAnyDevice(examId, studentId, allowed) {
    prepared('UPDATE exam_variants SET any_device = ? WHERE exam_id = ? AND student_id = ?').run(allowed ? 1 : 0, examId, studentId);
  }

  function rowToPc(row) {
    return { id: row.id, name: row.name, ip: row.ip, mac: row.mac, room: row.room, updatedAt: row.updated_at };
  }

  function getExamPcs() {
    return prepared('SELECT * FROM exam_pcs ORDER BY name').all().map(rowToPc);
  }

  // By name: a PC keeps its name when its address changes.
  function saveExamPc({ name, ip, mac, room }) {
    prepared(
      `INSERT INTO exam_pcs (name, ip, mac, room, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (name) DO UPDATE SET ip = excluded.ip, mac = excluded.mac, room = excluded.room, updated_at = excluded.updated_at`
    ).run(name, ip, mac || null, room || null, now());
  }

  function deleteExamPc(id) {
    prepared('DELETE FROM exam_pcs WHERE id = ?').run(id);
  }

  function getExamEventsOfType(examId, types) {
    return prepared(`SELECT * FROM exam_events WHERE exam_id = ? AND type IN (${types.map(() => '?').join(', ')}) ORDER BY id`).all(examId, ...types);
  }

  function insertExamEvent(examId, studentId, seq, ts, stage, task, type, summary) {
    prepared('INSERT INTO exam_events (exam_id, student_id, seq, ts, stage, task, type, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(examId, studentId, seq, ts, stage, task, type, summary);
  }

  function getExamEvents(examId, studentId) {
    return prepared('SELECT * FROM exam_events WHERE exam_id = ? AND student_id = ? ORDER BY seq').all(examId, studentId);
  }

  function getExamEventCounts(examId) {
    return prepared('SELECT student_id AS studentId, COUNT(*) AS events, MAX(ts) AS lastAt FROM exam_events WHERE exam_id = ? GROUP BY student_id').all(examId);
  }

  return {
    ensureExam,
    setExamWindow,
    setExamPublished,
    setExamLockPractice,
    setExamFinalized,
    getExamVariant,
    getExamVariants,
    saveExamVariant,
    getExamTasks,
    getExamTask,
    saveExamDraft,
    recordExamAttempt,
    takeExamRun,
    submitExamTask,
    setExamTaskResult,
    setExamTeacherScore,
    saveExamReport,
    finalizeExamTasks,
    setExamDeviceMode,
    setExamAnyDevice,
    getExamPcs,
    saveExamPc,
    deleteExamPc,
    getExamEventsOfType,
    insertExamEvent,
    getExamEvents,
    getExamEventCounts,
  };
}

module.exports = { makeExamDb };
