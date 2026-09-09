const fs = require('fs');
const path = require('path');

function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, `${name}.json`), 'utf-8'));
}

let users = null;
let courses = null;
let assignments = null;
let submissions = null;

function getUsers() {
  return users || (users = loadJSON('users'));
}

function getCourses() {
  return courses || (courses = loadJSON('courses'));
}

function getAssignments() {
  return assignments || (assignments = loadJSON('assignments'));
}

function getSubmissions() {
  return submissions || (submissions = loadJSON('submissions'));
}

function updateSubmissionStatus(id, status, comment) {
  const submission = getSubmissions().find((s) => s.id === id);
  if (!submission) return null;
  submission.status = status;
  submission.comment = comment || null;
  submission.checkedAt = new Date().toISOString();
  return submission;
}

function reopenSubmission(id) {
  const submission = getSubmissions().find((s) => s.id === id);
  if (!submission) return null;
  submission.status = 'pending';
  return submission;
}

function __resetForTests() {
  users = courses = assignments = submissions = null;
}

module.exports = {
  getUsers,
  getCourses,
  getAssignments,
  getSubmissions,
  updateSubmissionStatus,
  reopenSubmission,
  __resetForTests,
};
