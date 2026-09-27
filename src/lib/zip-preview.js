const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal read-only ZIP reader (central directory + stored/deflate entries) so the
// review page can list and preview source files inside a student's archive without
// adding a dependency. RAR archives aren't readable here — they're download-only.

const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 200 * 1024;
const MAX_ENTRIES = 2000;

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.py', '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.html', '.htm', '.css', '.scss',
  '.sql', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.sh', '.bat', '.yml', '.yaml',
  '.xml', '.csv', '.ini', '.toml', '.env', '.gitignore', '.kt', '.swift', '.vue', '.svelte', '.ipynb',
]);

const LANGUAGE_BY_EXT = {
  '.py': 'python', '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.ts': 'typescript',
  '.jsx': 'javascript', '.tsx': 'typescript', '.json': 'json', '.html': 'xml', '.htm': 'xml', '.xml': 'xml',
  '.css': 'css', '.scss': 'scss', '.sql': 'sql', '.java': 'java', '.c': 'c', '.h': 'c', '.cpp': 'cpp',
  '.hpp': 'cpp', '.cs': 'csharp', '.go': 'go', '.rs': 'rust', '.rb': 'ruby', '.php': 'php', '.sh': 'bash',
  '.yml': 'yaml', '.yaml': 'yaml', '.md': 'markdown', '.kt': 'kotlin', '.swift': 'swift',
};

function isZip(filename) {
  return path.extname(filename).toLowerCase() === '.zip';
}

function isPreviewable(name) {
  const base = path.basename(name).toLowerCase();
  return TEXT_EXTENSIONS.has(path.extname(base)) || TEXT_EXTENSIONS.has(base);
}

function languageFor(name) {
  return LANGUAGE_BY_EXT[path.extname(name).toLowerCase()] || null;
}

function findEndOfCentralDirectory(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

// Names are decoded as UTF-8 whether or not the UTF-8 flag (bit 11) is set: archives
// from common tools use UTF-8 for Cyrillic in practice, and cp437 would be mojibake.
function decodeName(bytes) {
  return bytes.toString('utf8');
}

function readEntries(buf) {
  const eocd = findEndOfCentralDirectory(buf);
  if (eocd < 0) throw new Error('not a zip archive');
  const count = Math.min(buf.readUInt16LE(eocd + 10), MAX_ENTRIES);
  let offset = buf.readUInt32LE(eocd + 16);

  const entries = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) break;
    const flags = buf.readUInt16LE(offset + 8);
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const size = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = decodeName(buf.subarray(offset + 46, offset + 46 + nameLen));
    offset += 46 + nameLen + extraLen + commentLen;

    const isDir = name.endsWith('/');
    if (isDir || name.startsWith('__MACOSX/') || path.basename(name) === '.DS_Store') continue;
    entries.push({ index: entries.length, name, size, compressedSize, method, localOffset, flags });
  }
  return entries;
}

function extractEntry(buf, entry) {
  const off = entry.localOffset;
  if (buf.readUInt32LE(off) !== 0x04034b50) throw new Error('bad local header');
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const start = off + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.compressedSize);
  if (entry.flags & 0x1) throw new Error('encrypted');
  if (entry.method === 0) return data;
  if (entry.method === 8) return zlib.inflateRawSync(data, { maxOutputLength: MAX_PREVIEW_BYTES * 4 });
  throw new Error('unsupported compression');
}

function loadArchive(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_ARCHIVE_BYTES) throw new Error('archive too large');
  return fs.readFileSync(filePath);
}

// Lists files inside a zip. Returns { entries } or { error } — never throws, a broken
// student archive must not break the review page.
function listZip(filePath) {
  try {
    const entries = readEntries(loadArchive(filePath)).map((e) => ({
      index: e.index,
      name: e.name,
      size: e.size,
      previewable: isPreviewable(e.name) && e.size <= MAX_PREVIEW_BYTES,
    }));
    return { entries };
  } catch (err) {
    return { error: 'Не удалось прочитать архив' };
  }
}

function previewZipEntry(filePath, entryIndex) {
  try {
    const buf = loadArchive(filePath);
    const entry = readEntries(buf)[Number(entryIndex)];
    if (!entry) return { error: 'Файл не найден в архиве' };
    if (!isPreviewable(entry.name)) return { error: 'Этот тип файла нельзя просмотреть — скачайте архив', entry };
    if (entry.size > MAX_PREVIEW_BYTES) return { error: 'Файл слишком большой для просмотра — скачайте архив', entry };
    const text = extractEntry(buf, entry).toString('utf8');
    return { entry: { index: entry.index, name: entry.name, size: entry.size }, text, language: languageFor(entry.name) };
  } catch (err) {
    return { error: 'Не удалось открыть файл из архива' };
  }
}

module.exports = { isZip, listZip, previewZipEntry, languageFor };
