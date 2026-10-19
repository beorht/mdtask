const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { UPLOAD_DIR } = require('./submission-files');

// Editor assignments (assignments.code_files): the student writes the listed files in
// the browser, and a submit stores them as one solution.zip — the same shape as an
// uploaded archive, so the admin review page previews it without changes.

const SUBMISSION_ARCHIVE_NAME = 'solution.zip';
const MAX_FILE_BYTES = 100 * 1024;

// Takes the request body's { fileName: code } and keeps exactly the assignment's files.
// Returns { files } or { error }.
function parseCodeFiles(assignment, body) {
  const input = body && typeof body.files === 'object' && body.files ? body.files : null;
  if (!input) return { error: 'Нет файлов решения.' };
  const files = {};
  for (const name of assignment.codeFiles) {
    if (isReadonly(assignment, name)) {
      files[name] = starterCode(assignment, name);
      continue;
    }
    const code = input[name];
    if (code !== undefined && typeof code !== 'string') return { error: `Файл ${name}: неверные данные.` };
    const text = (code || '').replace(/\r\n/g, '\n');
    if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
      return { error: `Файл ${name} слишком большой (больше ${MAX_FILE_BYTES / 1024} КБ).` };
    }
    files[name] = text;
  }
  return { files };
}

// Minimal ZIP writer (deflate, UTF-8 names): [{ name, content }] → Buffer.
function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const { name, content } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const packed = zlib.deflateRawSync(data);
    const crc = zlib.crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + packed.length;
  }

  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// Writes the archive into the submission's upload dir; returns { files, storedFiles }
// for createSubmission / updateSubmissionFiles.
function storeCodeSubmission(assignment, studentId, files) {
  const dir = path.join(UPLOAD_DIR, assignment.id, studentId);
  fs.mkdirSync(dir, { recursive: true });
  const stored = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${SUBMISSION_ARCHIVE_NAME}`;
  const entries = assignment.codeFiles.map((name) => ({ name, content: files[name] || '' }));
  fs.writeFileSync(path.join(dir, stored), createZip(entries));
  return { files: [SUBMISSION_ARCHIVE_NAME], storedFiles: [stored] };
}

function isReadonly(assignment, name) {
  return (assignment.codeReadonly || []).includes(name);
}

function starterCode(assignment, name) {
  const starter = assignment.codeStarter && assignment.codeStarter[name];
  return typeof starter === 'string' ? starter : `# ${name}\n`;
}

// What the editor opens with: the saved draft (a submit saves it too), else the starter code.
// Read-only files always show the starter.
function initialCode(assignment, draft) {
  const files = {};
  for (const name of assignment.codeFiles) {
    const saved = draft && typeof draft.files[name] === 'string' ? draft.files[name] : null;
    files[name] = saved !== null && !isReadonly(assignment, name) ? saved : starterCode(assignment, name);
  }
  return files;
}

module.exports = { SUBMISSION_ARCHIVE_NAME, MAX_FILE_BYTES, parseCodeFiles, createZip, storeCodeSubmission, initialCode, isReadonly };
