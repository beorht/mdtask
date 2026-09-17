const fs = require('fs');
const path = require('path');
const { parseSummary } = require('./summary-parser');
const { getAssignments, getSubmissions } = require('../db');
const { TOPICS } = require('./sql-topics');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');

function buildSidebarTree({ role, studentId }) {
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

  const topicChildren = TOPICS.map((topic) => ({
    title: topic.label,
    href: null,
    children: [
      { title: 'Теор. мат.', href: `/trainer/theory/${topic.key}`, children: [] },
      ...(role === 'student' ? [{ title: 'Прак. мат.', href: `/trainer/practice/${topic.key}`, children: [] }] : []),
    ],
  }));

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
