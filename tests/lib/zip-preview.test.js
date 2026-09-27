const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listZip, previewZipEntry } = require('../../src/lib/zip-preview');
const { buildZip } = require('../helpers/zip');

function tmpZip(files) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdtask-zip-')), 'work.zip');
  fs.writeFileSync(file, buildZip(files));
  return file;
}

test('listZip lists files and marks source files previewable', () => {
  const file = tmpZip({ 'main.py': 'print("hi")\n', 'data.bin': 'xx', 'src/app.js': 'let a = 1;' });
  const { entries } = listZip(file);
  assert.deepStrictEqual(entries.map((e) => e.name), ['main.py', 'data.bin', 'src/app.js']);
  assert.deepStrictEqual(entries.map((e) => e.previewable), [true, false, true]);
});

test('previewZipEntry inflates a deflated entry with its detected language', () => {
  const file = tmpZip({ 'задача.py': 'def f():\n    return "привет"\n' });
  const preview = previewZipEntry(file, 0);
  assert.strictEqual(preview.text, 'def f():\n    return "привет"\n');
  assert.strictEqual(preview.language, 'python');
  assert.strictEqual(preview.entry.name, 'задача.py');
});

test('previewZipEntry refuses binary entries and unknown indexes without throwing', () => {
  const file = tmpZip({ 'image.png': 'binary' });
  assert.match(previewZipEntry(file, 0).error, /нельзя просмотреть/);
  assert.match(previewZipEntry(file, 5).error, /не найден/);
});

test('a corrupt archive yields an error instead of throwing', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mdtask-zip-')), 'broken.zip');
  fs.writeFileSync(file, 'this is not a zip');
  assert.ok(listZip(file).error);
  assert.ok(previewZipEntry(file, 0).error);
});
