const fs = require('fs');
const path = require('path');
const { parseSummary } = require('./summary-parser');
const { getAssignments, getSubmissions, getSqlExercises, getSolvedSqlExerciseIds } = require('../db');
const { getTopicsForUser } = require('./sql-topics');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

function buildSidebarTree({ role, studentId, studentGroup }) {
  const TOPICS = getTopicsForUser({ role, group: studentGroup });
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
      let navStatus = 'not_started';
      if (!prevTopicSolved) navStatus = 'locked';
      else if (total > 0 && solved === total) navStatus = 'done';
      else if (solved > 0) navStatus = 'current';
      prevTopicSolved = prevTopicSolved && total > 0 && solved === total;

      children.push({ title: 'Прак. мат.', href: `/trainer/practice/${topic.key}`, navStatus, children: [] });
    }

    return { title: topic.label, href: null, children };
  });

  if (role === 'teacher') {
    topicChildren.push({ title: 'Результаты тренажёра', href: '/teacher/trainer/results', children: [] });
  }

  const trainerSection = {
    title: 'SQL DataBase',
    href: null,
    children: topicChildren,
  };

  return [...attach(tree), trainerSection];
}

module.exports = { buildSidebarTree };
