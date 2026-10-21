const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../../src/server');

const ROOT = path.join(__dirname, '..', '..');

function filesUnder(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return filesUnder(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });
}

// Classroom PCs have no internet: Python and the code editor come from the site itself.
test('Python (Pyodide with sqlite3) and CodeMirror are served by the site', async () => {
  const app = createApp();
  const wasm = await request(app).get('/vendor/pyodide/0.26.4/pyodide.asm.wasm');
  assert.strictEqual(wasm.status, 200);
  assert.match(wasm.headers['content-type'], /^application\/wasm/);
  for (const url of [
    '/vendor/pyodide/0.26.4/pyodide.js',
    '/vendor/pyodide/0.26.4/pyodide.asm.js',
    '/vendor/pyodide/0.26.4/python_stdlib.zip',
    '/vendor/pyodide/0.26.4/pyodide-lock.json',
    '/vendor/pyodide/0.26.4/sqlite3-1.0.0.zip',
    '/vendor/codemirror/5.65.16/codemirror.min.js',
    '/vendor/codemirror/5.65.16/mode/python/python.min.js',
  ]) {
    assert.strictEqual((await request(app).head(url)).status, 200, url);
  }
});

test('no page or script loads code from a CDN', () => {
  const files = [...filesUnder(path.join(ROOT, 'src', 'views'), '.ejs'), ...filesUnder(path.join(ROOT, 'public', 'js'), '.js')];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com/.test(text), path.relative(ROOT, file));
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'public', 'js', 'python-worker.js'), 'utf8'), /PYODIDE_URL = '\/vendor\/pyodide\/0\.26\.4\/'/);
});

// A bug program's run is asked for (and counted) only after Python has loaded.
test('the exam editor loads Python before asking for a run', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'js', 'exam-code.js'), 'utf8');
  assert.match(js, /\.then\(loadPython\)\s*\.then\(function \(\) \{ return post\(URL \+ '\/run'/);
});
