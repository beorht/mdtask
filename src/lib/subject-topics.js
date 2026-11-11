// Реестр предметов с темами для админ-страницы блокировок (/admin/locks, src/lib/topic-locks.js).
// Для каждого предмета: ключ, название, группы, список тем (key+title+total) и completion(group) —
// кто из студентов группы выполнил тему. Переиспует admin.overview предметов. Растёт по мере
// подключения предметов к блокировкам (сейчас: HTML, CSS).
const html = require('./html-course');
const htmlAdmin = require('./html-course/admin');
const css = require('./css-course');
const cssAdmin = require('./css-course/admin');
const bash = require('./bash-course');
const bashAdmin = require('./bash-course/admin');

function topicsOf(course, { trainer = false } = {}) {
  const list = [];
  if (trainer && course.TRAINER) {
    list.push({ key: course.TRAINER_KEY, title: `Тренажёр: ${course.TRAINER.title}`, total: course.TRAINER.tasks.length });
  }
  for (const t of course.TOPICS) {
    if (t.ready) list.push({ key: t.key, title: `Тема ${t.number}. ${t.title}`, total: t.tasks.length });
  }
  return list;
}

const SUBJECTS = {
  html: {
    key: 'html', title: html.HTML_TITLE, groups: html.HTML_GROUPS,
    topics: topicsOf(html, { trainer: true }),
    overview: (group) => htmlAdmin.overview({ group }),
  },
  css: {
    key: 'css', title: css.CSS_TITLE, groups: css.CSS_GROUPS,
    topics: topicsOf(css),
    overview: (group) => cssAdmin.overview({ group }),
  },
  bash: {
    key: bash.SUBJECT_KEY, title: bash.SUBJECT_TITLE, groups: bash.BASH_COURSE_GROUPS,
    topics: topicsOf(bash),
    overview: (group) => bashAdmin.overview({ group }),
  },
};

const list = () => Object.values(SUBJECTS).map((s) => ({ key: s.key, title: s.title, groups: s.groups }));
const get = (key) => SUBJECTS[key] || null;

// Прогресс по темам: Map ключ_темы → { total, done, students:[{id,name,group,solved,done}] }.
// group — конкретная группа или undefined (все студенты, видящие предмет).
function completion(subjectKey, group) {
  const reg = SUBJECTS[subjectKey];
  if (!reg) return { count: 0, byKey: {} };
  const o = reg.overview(group);
  const byKey = {};
  for (const t of reg.topics) byKey[t.key] = { total: t.total, done: 0, students: [] };
  for (const r of o.rows) {
    for (const t of reg.topics) {
      const rt = (r.topics || []).find((x) => x.key === t.key);
      const solved = rt ? rt.solved : 0;
      const done = t.total > 0 && solved === t.total;
      byKey[t.key].students.push({ id: r.student.id, name: r.student.name, group: r.student.group, solved, done });
      if (done) byKey[t.key].done += 1;
    }
  }
  return { count: o.rows.length, byKey };
}

// Студенты, видящие предмет (для выбора в режиме «студент»), отсортированы по группе и имени.
function studentsOf(subjectKey) {
  const reg = SUBJECTS[subjectKey];
  if (!reg) return [];
  return reg.overview(undefined).rows
    .map((r) => ({ id: r.student.id, name: r.student.name, group: r.student.group }))
    .sort((a, b) => (a.group || '').localeCompare(b.group || '', 'ru') || a.name.localeCompare(b.name, 'ru'));
}

module.exports = { SUBJECTS, list, get, completion, studentsOf };
