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

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

// `subject` scopes the tree to one subject ('sql' | 'python' | 'javascript'); without it the
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

  const homeLink =
    role === 'teacher'
      ? { title: '← Админ-панель', href: '/admin', children: [] }
      : { title: '← Все предметы', href: '/', children: [] };

  if (subject === 'sql') {
    const overview = role === 'student' ? [{ title: 'Обзор предмета', href: '/subjects/sql', children: [] }] : [];
    return [homeLink, ...overview, { ...trainerSection, title: 'Базы данных (SQL)' }];
  }

  if (LANGUAGE_SUBJECTS[subject]) {
    const withSubjectLinks = (nodes) =>
      nodes.map((node) => ({
        ...node,
        href: node.assignmentId ? `/assignment/${node.assignmentId}?subject=${subject}` : node.href || null,
        children: withSubjectLinks(node.children),
      }));

    const bankTopics = [];
    for (const ex of getLanguageExercises(subject)) {
      let topic = bankTopics.find((t) => t.key === ex.topic);
      if (!topic) {
        topic = { key: ex.topic, title: ex.topicLabel, href: null, children: [] };
        bankTopics.push(topic);
      }
      topic.children.push({ title: ex.title, href: `/subjects/${subject}/bank/${ex.id}`, children: [] });
    }

    return [
      homeLink,
      { title: 'Обзор предмета', href: `/subjects/${subject}`, children: [] },
      { title: 'Задания со сдачей', href: null, children: withSubjectLinks(attach(tree)) },
      { title: 'Банк задач', href: null, children: bankTopics },
    ];
  }

  return [...attach(tree), ...groupCategories, trainerSection];
}

module.exports = { buildSidebarTree };
