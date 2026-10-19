// The student's terminal sandbox for stages 1, 2 and 5: the files from scenario.js laid out by
// ib/ctf/exam/generate_exam.py under data/exam/<exam>/sandbox/<student>/. The terminal backend
// (ib/server/app.py, task "exam-<exam>") opens it as the "/" of the server.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { examDir } = require('./log');

const GENERATOR = path.join(__dirname, '..', '..', '..', 'ib', 'ctf', 'exam', 'generate_exam.py');
const PYTHON = process.env.IB_PYTHON || 'python3';

function sandboxBase(examId) {
  return path.join(examDir(examId), 'sandbox');
}

function sandboxExists(examId, studentId) {
  return fs.existsSync(path.join(sandboxBase(examId), studentId, 'home', studentId));
}

function writeSandbox(examId, studentId, scenario) {
  const spec = {
    base: sandboxBase(examId),
    student: studentId,
    files: scenario.files,
    databases: scenario.databases,
    protected: scenario.protectedDb,
  };
  const proc = spawnSync(PYTHON, [GENERATOR], {
    input: JSON.stringify(spec),
    encoding: 'utf-8',
    timeout: 60000,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
  if (proc.status !== 0) {
    throw new Error(`песочница ${studentId} не создана: ${(proc.stderr || proc.error || '').toString().trim().split('\n').pop()}`);
  }
  return JSON.parse(proc.stdout).root;
}

module.exports = { sandboxBase, sandboxExists, writeSandbox };
