// DB-доступ к админ-блокировкам/дедлайнам тем (таблица topic_overrides, см. schema.sql).
// Собирается в index.js с подключением и кэшем запросов; функции реэкспортируются оттуда.

function makeTopicLocksDb(db, prepared) {
  const now = () => new Date().toISOString();

  // Одна запись (предмет, тема, область, цель) или null.
  function getTopicOverride(subject, topicKey, scope, target) {
    return prepared(
      'SELECT * FROM topic_overrides WHERE subject = ? AND topic_key = ? AND scope = ? AND target = ?'
    ).get(subject, topicKey, scope, target) || null;
  }

  // Все записи предмета (для админки). Без subject — вообще все.
  function listTopicOverrides(subject) {
    return subject
      ? prepared('SELECT * FROM topic_overrides WHERE subject = ?').all(subject)
      : prepared('SELECT * FROM topic_overrides').all();
  }

  // Записи, которые могут касаться конкретного студента: его группы + лично его.
  function topicOverridesForStudent(subject, group, studentId) {
    return prepared(
      `SELECT * FROM topic_overrides
       WHERE subject = ? AND ((scope = 'group' AND target = ?) OR (scope = 'student' AND target = ?))`
    ).all(subject, group || '', studentId || '');
  }

  // Поставить/обновить запись. mode: 'lock' | 'deadline' | 'allow'.
  function setTopicOverride({ subject, topicKey, scope, target, mode, deadline = null, note = null, by = null }) {
    prepared(
      `INSERT INTO topic_overrides (subject, topic_key, scope, target, mode, deadline, note, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(subject, topic_key, scope, target)
       DO UPDATE SET mode = excluded.mode, deadline = excluded.deadline, note = excluded.note,
                     updated_at = excluded.updated_at, updated_by = excluded.updated_by`
    ).run(subject, topicKey, scope, target, mode, deadline, note, now(), by);
  }

  function clearTopicOverride(subject, topicKey, scope, target) {
    prepared('DELETE FROM topic_overrides WHERE subject = ? AND topic_key = ? AND scope = ? AND target = ?')
      .run(subject, topicKey, scope, target);
  }

  return {
    getTopicOverride,
    listTopicOverrides,
    topicOverridesForStudent,
    setTopicOverride,
    clearTopicOverride,
  };
}

module.exports = { makeTopicLocksDb };
