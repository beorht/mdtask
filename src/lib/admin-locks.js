// Данные для админ-страницы блокировок/дедлайнов тем (/admin/locks, src/routes/admin-locks.js).
// Режимы: по группе и по студенту. Переиспует реестр предметов (subject-topics) и ядро (topic-locks).
const db = require('../db');
const subjectTopics = require('./subject-topics');
const topicLocks = require('./topic-locks');

const TZ_OFFSET = '+05:00'; // аудитории/экзамены идут по +05

// ISO (UTC) → значение для <input type="datetime-local"> в +05 ("YYYY-MM-DDTHH:MM").
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d).reduce((o, p) => (o[p.type] = p.value, o), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Значение datetime-local (+05) → ISO (UTC). Пусто/битое → null.
function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(`${value}:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Все записи предмета в карту: `${scope}:${target}:${topicKey}` → row.
function overrideMap(subject) {
  const map = new Map();
  for (const r of db.listTopicOverrides(subject)) map.set(`${r.scope}:${r.target}:${r.topic_key}`, r);
  return map;
}

function rowForTopic(t, row, effective) {
  return {
    key: t.key,
    title: t.title,
    total: t.total,
    mode: row ? row.mode : 'none',
    deadlineInput: row ? toLocalInput(row.deadline) : '',
    note: row ? row.note || '' : '',
    effective, // { locked, forcedOpen, deadlineText, overdue, reason } или null
  };
}

function pageData({ subject, scope, group, student } = {}) {
  const subjects = subjectTopics.list();
  const subj = subjectTopics.get(subject) || subjectTopics.get(subjects[0] && subjects[0].key);
  if (!subj) return { subjects, subject: null };
  scope = scope === 'student' ? 'student' : 'group';
  const map = overrideMap(subj.key);

  const base = {
    subjects,
    subject: { key: subj.key, title: subj.title, groups: subj.groups },
    scope,
  };

  if (scope === 'group') {
    const groups = subj.groups;
    const sel = groups.includes(group) ? group : groups[0] || '';
    const comp = sel ? subjectTopics.completion(subj.key, sel) : { count: 0, byKey: {} };
    const topics = subj.topics.map((t) => {
      const row = map.get(`group:${sel}:${t.key}`);
      const c = comp.byKey[t.key] || { total: t.total, done: 0, students: [] };
      return { ...rowForTopic(t, row, null), done: c.done, students: c.students };
    });
    return { ...base, groups, group: sel, studentsCount: comp.count, topics };
  }

  // scope === 'student'
  const students = subjectTopics.studentsOf(subj.key);
  const sel = students.find((s) => s.id === student) || students[0] || null;
  let topics = [];
  if (sel) {
    const user = { id: sel.id, role: 'student', group: sel.group };
    const comp = subjectTopics.completion(subj.key, sel.group);
    topics = subj.topics.map((t) => {
      const row = map.get(`student:${sel.id}:${t.key}`);
      const eff = topicLocks.lockState(subj.key, t.key, user);
      const mine = (comp.byKey[t.key] || { students: [] }).students.find((x) => x.id === sel.id) || { solved: 0, done: false };
      return { ...rowForTopic(t, row, eff), solved: mine.solved, done: mine.done };
    });
  }
  return { ...base, students, student: sel, topics };
}

module.exports = { pageData, toLocalInput, fromLocalInput };
