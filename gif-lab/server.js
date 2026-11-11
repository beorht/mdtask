// Песочница анимаций: отдельный маленький сервер, не связан с основным сайтом (index.js, src/).
// Запуск: node gif-lab/server.js   → http://127.0.0.1:42530
// Порт можно поменять: GIF_LAB_PORT=42531 node gif-lab/server.js
//
// Что где:
//   library/            — все анимации: файлы (.gif/.webp/.png/.jpg) и папки с index.html
//   assignments.json    — какие анимации показываются для какого события (меняется со страницы)
//   events.json         — список событий и их описания

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LIB_DIR = path.join(ROOT, 'library');
const ASSIGN_FILE = path.join(ROOT, 'assignments.json');
const PORT = Number(process.env.GIF_LAB_PORT) || 42530;
const HOST = '127.0.0.1';
const MAX_BODY = 64 * 1024;

const IMAGE_EXT = new Set(['.gif', '.webp', '.png', '.jpg', '.jpeg']);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};
// Только эти файлы отдаются как страница; server.js, events.json и assignments.json наружу не выдаём.
const STATIC_FILES = new Set(['/', '/index.html', '/style.css', '/app.js']);

function readEvents() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'events.json'), 'utf8'));
}

function readAssignments() {
  try {
    return JSON.parse(fs.readFileSync(ASSIGN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Библиотека: каждый файл или папка с index.html — одна анимация. id = имя без расширения.
function library() {
  let entries = [];
  try {
    entries = fs.readdirSync(LIB_DIR, { withFileTypes: true });
  } catch {
    // папки ещё нет — библиотека пустая
  }
  const items = [];
  for (const e of entries) {
    if (e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase())) {
      items.push({
        id: path.parse(e.name).name,
        name: e.name,
        type: 'image',
        url: `/library/${encodeURIComponent(e.name)}`,
      });
    } else if (e.isDirectory() && fs.existsSync(path.join(LIB_DIR, e.name, 'index.html'))) {
      items.push({
        id: e.name,
        name: e.name,
        type: 'html',
        url: `/library/${encodeURIComponent(e.name)}/index.html`,
      });
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

// Каталог для страницы: события, каждое с назначенными анимациями; плюс вся библиотека.
function catalog() {
  const meta = readEvents();
  const assign = readAssignments();
  const lib = library();
  const byId = new Map(lib.map((item) => [item.id, item]));
  const events = meta.events.map((ev) => ({
    ...ev,
    gifs: (assign[ev.id] || []).map((id) => byId.get(id)).filter(Boolean),
  }));
  return { groups: meta.groups, events, library: lib, assignments: assign };
}

// Проверяем присланные назначения: только известные события и известные анимации.
function validAssignments(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const eventIds = new Set(readEvents().events.map((e) => e.id));
  const libIds = new Set(library().map((i) => i.id));
  const out = {};
  for (const [eventId, ids] of Object.entries(input)) {
    if (!eventIds.has(eventId)) return null;
    if (!Array.isArray(ids)) return null;
    for (const id of ids) {
      if (typeof id !== 'string' || !libIds.has(id)) return null;
    }
    out[eventId] = [...new Set(ids)];
  }
  return out;
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), TYPES['.json']);
}

// Безопасная отдача файла из каталога base: путь не должен выйти за пределы base.
function sendInside(res, base, relPath) {
  const full = path.resolve(base, '.' + relPath);
  if (full !== base && !full.startsWith(base + path.sep)) return send(res, 403, 'forbidden', 'text/plain; charset=utf-8');
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found', 'text/plain; charset=utf-8');
    const type = TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    fs.createReadStream(full).pipe(res);
  });
}

function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => cb(Buffer.concat(chunks).toString('utf8')));
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    return send(res, 400, 'bad request', 'text/plain; charset=utf-8');
  }

  if (pathname === '/api/catalog' && req.method === 'GET') {
    return sendJson(res, 200, catalog());
  }

  if (pathname === '/api/assignments' && req.method === 'POST') {
    return readBody(req, (text) => {
      let input;
      try {
        input = JSON.parse(text);
      } catch {
        return sendJson(res, 400, { error: 'Некорректный JSON' });
      }
      const clean = validAssignments(input);
      if (!clean) return sendJson(res, 400, { error: 'Неизвестное событие или анимация' });
      fs.writeFileSync(ASSIGN_FILE, JSON.stringify(clean, null, 2) + '\n', 'utf8');
      sendJson(res, 200, catalog());
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'method not allowed', 'text/plain; charset=utf-8');
  }

  if (pathname.startsWith('/library/')) {
    return sendInside(res, LIB_DIR, decodeURIComponent(pathname.slice('/library'.length)));
  }

  const file = pathname === '/' ? '/index.html' : pathname;
  if (STATIC_FILES.has(file)) {
    return sendInside(res, ROOT, file);
  }

  return send(res, 404, 'not found', 'text/plain; charset=utf-8');
});

server.listen(PORT, HOST, () => {
  console.log(`Песочница анимаций: http://${HOST}:${PORT}`);
});
