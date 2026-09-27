const fs = require('fs');
const path = require('path');

// Configurable so the test suite never touches real student uploads.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Resolves the on-disk path of a submission's Nth file, refusing anything that
// would escape the submission's own upload directory.
function resolveSubmissionFile(submission, rawIndex) {
  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index >= submission.storedFiles.length) {
    return { error: 'not_found' };
  }

  const dir = path.resolve(UPLOAD_DIR, submission.assignmentId, submission.studentId);
  const stored = submission.storedFiles[index];
  const filePath = path.resolve(dir, stored);
  if (filePath !== path.join(dir, stored) || !filePath.startsWith(dir + path.sep)) {
    return { error: 'invalid' };
  }
  if (!fs.existsSync(filePath)) return { error: 'not_found' };

  return { path: filePath, name: submission.files[index] || path.basename(filePath), index };
}

module.exports = { UPLOAD_DIR, resolveSubmissionFile };
