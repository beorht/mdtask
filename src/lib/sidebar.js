const fs = require('fs');
const path = require('path');
const { parseSummary } = require('./summary-parser');
const {
  getAssignments,
  getSubmissions,
  getSqlExercises,
  getSolvedSqlExerciseIds,
  getDistinctStudentGroups,
  getLanguageExercises,
} = require('../db');
const { getTopicsForUser } = require('./sql-topics');
const { hasFullAccess } = require('./test-access');
const { LANGUAGE_SUBJECTS } = require('./subjects');
const { IB_SUBJECT_KEY, IB_SUBJECT_TITLE, ibTasksForUser } = require('./ib-tasks');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

// `subject` scopes the tree to one subject ('sql' | 'python' | 'javascript' | 'ib'); without it the
// full combined tree is returned (all sections + teacher group categories + SQL trainer).
function buildSidebarTree({ role, studentId, studentGroup, subject }) {
  const TOPICS = getTopicsForUser({ role, group: studentGroup });
  const fullAccess = hasFullAccess({ role, group: studentGroup });
  const summaryText = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const tree = parseSummary(summaryText);
  const assignments = getAssignments();
  const submissions = studentId
    ? getSubmissions().filter((s) => s.studentId === studentId)
    : [];

  function attach(nodes) {
    return nodes
      .map((node) => {
        const assignment = assignments.find((a) => a.mdPath === node.path);

        if (
          role === 'student' &&
          assignment &&
          assignment.targetType === 'individual' &&
          assignment.targetStudentId !== studentId
        ) {
          return null;
        }

        if (
          role === 'student' &&
          assignment &&
          assignment.targetType === 'group' &&
          assignment.targetGroup &&
          assignment.targetGroup !== studentGroup &&
          !fullAccess
        ) {
          return null;
        }

        let status = null;
        if (role === 'student' && assignment) {
          const related = submissions.filter((s) => s.assignmentId === assignment.id);
          status = related.length ? related[related.length - 1].status : 'not_submitted';
        }

        return {
          title: node.title,
          path: node.path,
          assignmentId: assignment ? assignment.id : null,
          status,
          children: attach(node.children),
        };
      })
      .filter(Boolean);
  }

  let solvedIds = null;
  let exercisesByTopic = null;
  let prevTopicSolved = true;
  if (role === 'student') {
    solvedIds = getSolvedSqlExerciseIds(studentId);
    const exercises = getSqlExercises();
    exercisesByTopic = {};
    TOPICS.forEach((topic) => {
      exercisesByTopic[topic.key] = exercises.filter((e) => e.topic === topic.key);
    });
  }

  const topicChildren = TOPICS.map((topic) => {
    const children = [
      { title: 'Теор. мат.', href: `/trainer/theory/${topic.key}`, children: [] },
    ];

    if (role === 'student') {
      const topicExercises = exercisesByTopic[topic.key];
      const total = topicExercises.length;
      const solved = topicExercises.filter((e) => solvedIds.has(e.id)).length;

      // Theory-only topics (no exercises yet) have nothing to practice or lock —
      // skip the practice link and leave the unlock chain untouched.
      if (total > 0) {
        let navStatus = 'not_started';
        if (!prevTopicSolved && !fullAccess) navStatus = 'locked';
        else if (solved === total) navStatus = 'done';
        else if (solved > 0) navStatus = 'current';
        prevTopicSolved = prevTopicSolved && solved === total;

        children.push({ title: 'Прак. мат.', href: `/trainer/practice/${topic.key}`, navStatus, children: [] });
      }
    }

    return { title: topic.label, href: null, children };
  });

  if (role === 'teacher') {
    topicChildren.push({ title: 'Результаты тренажёра', href: '/admin/trainer/results', children: [] });
  }

  const trainerSection = {
    title: 'SQL DataBase',
    href: null,
    children: topicChildren,
  };

  const groupCategories = [];
  if (role === 'teacher') {
    const groups = getDistinctStudentGroups();
    for (const group of groups) {
      const children = assignments
        .filter((a) => a.targetType === 'group' && (a.targetGroup === group || !a.targetGroup))
        .map((a) => ({ title: a.title, assignmentId: a.id, children: [] }));
      if (children.length > 0) {
        groupCategories.push({ title: `Группа ${group}`, href: null, children });
      }
    }
  }

  // ---------- subject-scoped navigation ----------
  // Nodes carry a `kind` the sidebar partial renders specially:
  //   back    — "← Все предметы" link;
  //   header  — subject card: icon, title, progress (done / total);
  //   section — labelled block, optionally with a filter box;
  //   group   — collapsible topic/section: status icon, title, counter; opens when it holds the
  //             active page or is the student's current topic;
  //   link    — leaf link with an icon, optional counter / status badge / locked state.
  if (subject === 'sql') return sqlSubjectNav();
  if (LANGUAGE_SUBJECTS[subject]) return languageSubjectNav(subject);
  if (subject === IB_SUBJECT_KEY) return ibSubjectNav();

  function backLink() {
    return role === 'teacher'
      ? { kind: 'back', title: 'Админ-панель', href: '/admin', children: [] }
      : { kind: 'back', title: 'Все предметы', href: '/', children: [] };
  }

  function sqlSubjectNav() {
    const header = { kind: 'header', icon: '🗄️', title: 'Базы данных (SQL)', href: role === 'student' ? '/subjects/sql' : null, children: [] };

    if (role !== 'student') {
      const topics = TOPICS.map((t) => ({ kind: 'link', icon: '📖', title: t.label, href: `/trainer/theory/${t.key}`, children: [] }));
      return [
        backLink(),
        header,
        { kind: 'section', title: 'Теория по темам', filter: true, children: topics },
        { kind: 'section', title: 'Преподавателю', children: [{ kind: 'link', icon: '📊', title: 'Результаты тренажёра', href: '/admin/trainer/results', children: [] }] },
      ];
    }

    let chainOpen = true; // sequential unlock: a topic opens once every earlier one is fully solved
    let currentMarked = false;
    let solvedAll = 0;
    let totalAll = 0;
    const groups = TOPICS.map((topic, i) => {
      const list = exercisesByTopic[topic.key];
      const total = list.length;
      const solved = list.filter((e) => solvedIds.has(e.id)).length;
      solvedAll += solved;
      totalAll += total;

      const children = [{ kind: 'link', icon: '📖', title: 'Теория', href: `/trainer/theory/${topic.key}`, children: [] }];
      let status = 'theory';
      if (total > 0) {
        const locked = !chainOpen && !fullAccess;
        if (locked) status = 'locked';
        else if (solved === total) status = 'done';
        else if (!currentMarked) {
          status = 'current';
          currentMarked = true;
        } else status = 'open';
        chainOpen = chainOpen && solved === total;
        children.push({
          kind: 'link',
          icon: locked ? '🔒' : status === 'done' ? '✓' : '🧪',
          title: 'Практика',
          meta: `${solved}/${total}`,
          href: `/trainer/practice/${topic.key}`,
          locked,
          children: [],
        });
      }
      return {
        kind: 'group',
        number: i + 1,
        title: topic.label,
        status,
        meta: total > 0 ? `${solved}/${total}` : null,
        open: status === 'current',
        children,
      };
    });

    return [
      backLink(),
      { ...header, done: solvedAll, total: totalAll, label: 'задач решено' },
      { kind: 'section', title: 'Темы', filter: true, children: groups },
    ];
  }

  function ibSubjectNav() {
    const tasks = ibTasksForUser({ id: studentId }).filter((t) => t.assigned);
    const links = tasks.map((t) => ({
      kind: 'link',
      icon: t.solved ? '✓' : '💻',
      title: `№${t.number}. ${t.title}`,
      href: `/subjects/${IB_SUBJECT_KEY}/${t.key}`,
      children: [],
    }));
    return [
      backLink(),
      {
        kind: 'header',
        icon: '🛡️',
        title: IB_SUBJECT_TITLE,
        href: `/subjects/${IB_SUBJECT_KEY}`,
        done: tasks.filter((t) => t.solved).length,
        total: tasks.length,
        label: 'заданий выполнено',
        children: [],
      },
      { kind: 'section', title: 'Задания', children: links },
    ];
  }

  function languageSubjectNav(language) {
    const toNav = (nodes) =>
      nodes
        .map((node) => {
          if (node.assignmentId) {
            return {
              kind: 'link',
              title: node.title,
              href: `/assignment/${node.assignmentId}?subject=${language}`,
              assignmentId: node.assignmentId,
              status: node.status,
              children: [],
            };
          }
          const children = toNav(node.children);
          if (!children.length) return null; // SUMMARY entries without an assignment for this student
          const leaves = children.filter((c) => c.assignmentId);
          return {
            kind: 'group',
            title: node.title,
            status: leaves.length && leaves.every((c) => c.status === 'done') ? 'done' : 'open',
            meta: `${leaves.filter((c) => c.status === 'done').length}/${leaves.length}`,
            children,
          };
        })
        .filter(Boolean);

    const assignmentNav = toNav(attach(tree));
    // Open the first section that still has unfinished assignments.
    const firstOpen = assignmentNav.find((n) => n.kind === 'group' && n.status !== 'done');
    if (firstOpen) firstOpen.open = true;
    const allLeaves = [];
    (function walk(nodes) {
      nodes.forEach((n) => (n.assignmentId ? allLeaves.push(n) : walk(n.children)));
    })(assignmentNav);

    const bankGroups = [];
    for (const ex of getLanguageExercises(language)) {
      let topic = bankGroups.find((t) => t.key === ex.topic);
      if (!topic) {
        topic = { kind: 'group', key: ex.topic, title: ex.topicLabel, status: 'bank', children: [] };
        bankGroups.push(topic);
      }
      topic.children.push({ kind: 'link', icon: '📝', title: ex.title, href: `/subjects/${language}/bank/${ex.id}`, children: [] });
    }
    bankGroups.forEach((g) => (g.meta = String(g.children.length)));

    return [
      backLink(),
      {
        kind: 'header',
        icon: language === 'python' ? '🐍' : '🟨',
        title: LANGUAGE_SUBJECTS[language],
        href: `/subjects/${language}`,
        done: allLeaves.filter((l) => l.status === 'done').length,
        total: allLeaves.length,
        label: 'заданий принято',
        children: [],
      },
      { kind: 'section', title: 'Задания со сдачей', children: assignmentNav },
      { kind: 'section', title: 'Банк задач', filter: true, children: bankGroups },
    ];
  }

  return [...attach(tree), ...groupCategories, trainerSection];
}

module.exports = { buildSidebarTree };
