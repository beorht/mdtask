# Этап 0 — UI-прототип: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a running Express + EJS prototype of the mdBook-style practical-assignments platform, driven entirely by fixture JSON files and a sample mdBook content tree, covering every screen from the spec (login, student dashboard, assignment view, teacher dashboard, assignment editor, submissions table).

**Architecture:** Server-rendered Express app. `content/` holds a real mdBook-shaped tree (`SUMMARY.md` + `src/**/*.md`) parsed at runtime. `src/fixtures/` holds in-memory JSON data standing in for the future SQLite tables. Routes cross-reference fixtures with the parsed content tree to build the sidebar and page bodies; no persistence beyond the running process.

**Tech Stack:** Node.js, Express, EJS, markdown-it, express-session. Dev/test: Node's built-in `node:test` runner + `supertest`. No ORM, no build step, no frontend framework.

**Spec:** `docs/superpowers/specs/2026-09-09-ui-prototype-design.md`

## Global Constraints

- No database, no real file upload/storage, no automated file persistence — this stage is fixtures + static content only.
- Auth is a mock: login by Student ID only, no password, looked up in `fixtures/users.json`.
- Same stack as future MVP (Express, EJS, markdown-it) so nothing here gets rewritten in Stage 1 — only fixture reads get swapped for SQL later.
- Status badges use exactly these states: `pending` (🟡 на проверке), `done` (🟢 выполнено), `not_done` (🔴 не выполнено), `not_submitted` (⚪ не сдано).
- Individual assignments (`targetType: 'individual'`) must never appear in another student's sidebar, dashboard, or be reachable by direct URL (404 instead).
- Manual browser verification is required at the end (light/dark theme, mobile sidebar, role separation) — no automated visual tests.

---

### Task 1: Project scaffolding and health check

**Files:**
- Create: `package.json`
- Create: `index.js`
- Create: `src/server.js`
- Test: `tests/server.test.js`

**Interfaces:**
- Produces: `createApp()` from `src/server.js` — returns a configured but unstarted Express app instance. All later route tasks import and extend this function.

- [ ] **Step 1: Initialize package.json and install dependencies**

```bash
cd /home/thinklinux/Projects/mdtask
npm init -y
npm install express ejs markdown-it express-session
npm install --save-dev supertest
```

Edit `package.json` scripts section to:
```json
"scripts": {
  "start": "node index.js",
  "dev": "node --watch index.js",
  "test": "node --test tests/"
}
```

- [ ] **Step 2: Write the failing test**

```js
// tests/server.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../src/server');

test('GET /health returns 200 ok', async () => {
  const app = createApp();
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.text, 'ok');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/server'`

- [ ] **Step 4: Write minimal implementation**

```js
// src/server.js
const express = require('express');
const path = require('path');
const session = require('express-session');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: 'prototype-secret',
      resave: false,
      saveUninitialized: false,
    })
  );

  app.get('/health', (req, res) => res.status(200).send('ok'));

  return app;
}

module.exports = { createApp };
```

```js
// index.js
const { createApp } = require('./src/server');

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Create empty directories referenced above so the app doesn't crash on missing paths:
```bash
mkdir -p src/views public/css public/js content/src
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.js src/server.js tests/server.test.js
git commit -m "chore: scaffold Express app with health check"
```

---

### Task 2: Markdown rendering helper

**Files:**
- Create: `src/lib/markdown.js`
- Test: `tests/lib/markdown.test.js`

**Interfaces:**
- Produces: `renderMarkdown(text: string): string` and `extractHeadings(text: string): Array<{level: number, text: string, slug: string}>` — used by the assignment view (Task 8) and the editor live preview (Task 10).

- [ ] **Step 1: Write the failing test**

```js
// tests/lib/markdown.test.js
const test = require('node:test');
const assert = require('node:assert');
const { renderMarkdown, extractHeadings } = require('../../src/lib/markdown');

test('renderMarkdown converts headings and code blocks', () => {
  const html = renderMarkdown('# Title\n\n```js\nconst x = 1;\n```');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<pre><code/);
});

test('extractHeadings returns level, text and slug for each heading', () => {
  const headings = extractHeadings('# Задание 1\n\n## Критерии\n\nтекст\n\n## Ссылки');
  assert.deepStrictEqual(headings, [
    { level: 1, text: 'Задание 1', slug: 'zadanie-1' },
    { level: 2, text: 'Критерии', slug: 'kriterii' },
    { level: 2, text: 'Ссылки', slug: 'ssylki' },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/lib/markdown'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/markdown.js
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const TRANSLIT_MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(text) {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderMarkdown(text) {
  return md.render(text);
}

function extractHeadings(text) {
  const headings = [];
  const headingPattern = /^(#{1,3})\s+(.*)$/gm;
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    const level = match[1].length;
    const headingText = match[2].trim();
    headings.push({ level, text: headingText, slug: slugify(headingText) });
  }
  return headings;
}

module.exports = { renderMarkdown, extractHeadings };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/markdown.js tests/lib/markdown.test.js
git commit -m "feat: add markdown render and heading-extraction helper"
```

---

### Task 3: SUMMARY.md parser and sample content tree

**Files:**
- Create: `src/lib/summary-parser.js`
- Create: `content/SUMMARY.md`
- Create: `content/src/section-1/task-1.md`
- Create: `content/src/section-1/task-2.md`
- Create: `content/src/section-2/task-1.md`
- Create: `content/src/individual/student-1/extra-task.md`
- Test: `tests/lib/summary-parser.test.js`

**Interfaces:**
- Produces: `parseSummary(text: string): Array<{title: string, path: string|null, children: Array<...>}>` (recursive tree) — consumed by the sidebar builder (Task 5).

- [ ] **Step 1: Write the failing test**

```js
// tests/lib/summary-parser.test.js
const test = require('node:test');
const assert = require('node:assert');
const { parseSummary } = require('../../src/lib/summary-parser');

test('parseSummary builds a nested tree from indentation', () => {
  const text = [
    '# Summary',
    '',
    '- [Раздел 1]()',
    '  - [Задание 1](section-1/task-1.md)',
    '  - [Задание 2](section-1/task-2.md)',
    '- [Раздел 2]()',
    '  - [Задание 1](section-2/task-1.md)',
  ].join('\n');

  const tree = parseSummary(text);

  assert.strictEqual(tree.length, 2);
  assert.strictEqual(tree[0].title, 'Раздел 1');
  assert.strictEqual(tree[0].path, null);
  assert.strictEqual(tree[0].children.length, 2);
  assert.strictEqual(tree[0].children[0].path, 'section-1/task-1.md');
  assert.strictEqual(tree[1].children[0].path, 'section-2/task-1.md');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/lib/summary-parser'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/summary-parser.js
function parseSummary(text) {
  const lines = text.split('\n');
  const root = [];
  const stack = [{ depth: -1, children: root }];

  for (const line of lines) {
    const match = line.match(/^(\s*)-\s*\[(.*?)\]\((.*?)\)/);
    if (!match) continue;

    const depth = Math.floor(match[1].length / 2);
    const node = { title: match[2], path: match[3] || null, children: [] };

    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push({ depth, children: node.children });
  }

  return root;
}

module.exports = { parseSummary };
```

Create `content/SUMMARY.md`:
```markdown
# Summary

- [Раздел 1]()
  - [Задание 1](section-1/task-1.md)
  - [Задание 2](section-1/task-2.md)
- [Раздел 2]()
  - [Задание 1](section-2/task-1.md)
- [Мои доп. задания]()
  - [Дополнительное задание](individual/student-1/extra-task.md)
```

Create `content/src/section-1/task-1.md`:
```markdown
# Задание 1: Настройка репозитория

Инициализируйте git-репозиторий проекта и сделайте первый коммит.

## Критерии
- Репозиторий инициализирован
- Есть файл `README.md`
- Есть хотя бы один коммит

## Формат сдачи
Архив `.zip` с папкой `.git`.
```

Create `content/src/section-1/task-2.md`:
```markdown
# Задание 2: Ветвление

Создайте ветку `feature/hello`, внесите изменение и оформите merge в `main`.

## Критерии
- Ветка создана и содержит коммит
- Merge выполнен без конфликтов

## Формат сдачи
Архив `.zip` с папкой `.git`.
```

Create `content/src/section-2/task-1.md`:
```markdown
# Задание 1: Express-сервер

Поднимите минимальный HTTP-сервер на Express с маршрутом `GET /`.

## Критерии
- Сервер запускается командой `npm start`
- Маршрут `/` возвращает 200

## Формат сдачи
Архив `.zip` с исходным кодом.
```

Create `content/src/individual/student-1/extra-task.md`:
```markdown
# Дополнительное задание: Рефакторинг

Индивидуальное задание — приведите код из задания 1 к единому стилю (ESLint).

## Критерии
- `npx eslint .` не выдаёт ошибок

## Формат сдачи
Архив `.zip` с исходным кодом.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/summary-parser.js content/ tests/lib/summary-parser.test.js
git commit -m "feat: add SUMMARY.md parser and sample mdBook content tree"
```

---

### Task 4: Fixtures data and loader

**Files:**
- Create: `src/fixtures/users.json`
- Create: `src/fixtures/courses.json`
- Create: `src/fixtures/assignments.json`
- Create: `src/fixtures/submissions.json`
- Create: `src/fixtures/index.js`
- Test: `tests/fixtures/index.test.js`

**Interfaces:**
- Produces: `getUsers()`, `getCourses()`, `getAssignments()`, `getSubmissions()` (each returns an array, cached in-memory after first read), `updateSubmissionStatus(id, status, comment)`, `reopenSubmission(id)`, and `__resetForTests()` (test-only cache reset) from `src/fixtures/index.js`. Consumed by every route task (5–11).

- [ ] **Step 1: Write the failing test**

```js
// tests/fixtures/index.test.js
const test = require('node:test');
const assert = require('node:assert');
const fixtures = require('../../src/fixtures');

test('getUsers returns seeded student and teacher accounts', () => {
  const users = fixtures.getUsers();
  assert.ok(users.find((u) => u.id === 'student-1' && u.role === 'student'));
  assert.ok(users.find((u) => u.id === 'teacher-1' && u.role === 'teacher'));
});

test('getAssignments includes one individual assignment for student-1', () => {
  const assignments = fixtures.getAssignments();
  const individual = assignments.find((a) => a.targetType === 'individual');
  assert.strictEqual(individual.targetStudentId, 'student-1');
  assert.strictEqual(individual.mdPath, 'individual/student-1/extra-task.md');
});

test('updateSubmissionStatus mutates the in-memory submission', () => {
  fixtures.__resetForTests();
  const before = fixtures.getSubmissions()[0];
  fixtures.updateSubmissionStatus(before.id, 'done', 'Отлично');
  const after = fixtures.getSubmissions().find((s) => s.id === before.id);
  assert.strictEqual(after.status, 'done');
  assert.strictEqual(after.comment, 'Отлично');
});

test('reopenSubmission resets status to pending', () => {
  fixtures.__resetForTests();
  const target = fixtures.getSubmissions().find((s) => s.status === 'not_done');
  fixtures.reopenSubmission(target.id);
  const after = fixtures.getSubmissions().find((s) => s.id === target.id);
  assert.strictEqual(after.status, 'pending');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/fixtures'`

- [ ] **Step 3: Write minimal implementation**

Create `src/fixtures/users.json`:
```json
[
  { "id": "student-1", "role": "student", "name": "Иван Иванов", "group": "IT-21" },
  { "id": "student-2", "role": "student", "name": "Мария Петрова", "group": "IT-21" },
  { "id": "teacher-1", "role": "teacher", "name": "Сергей Смирнов" }
]
```

Create `src/fixtures/courses.json`:
```json
[
  { "id": "course-1", "title": "Веб-разработка", "teacherId": "teacher-1" }
]
```

Create `src/fixtures/assignments.json`:
```json
[
  {
    "id": "assign-1",
    "courseId": "course-1",
    "title": "Задание 1: Настройка репозитория",
    "mdPath": "section-1/task-1.md",
    "targetType": "group",
    "targetStudentId": null,
    "dueDate": "2026-09-20"
  },
  {
    "id": "assign-2",
    "courseId": "course-1",
    "title": "Задание 2: Ветвление",
    "mdPath": "section-1/task-2.md",
    "targetType": "group",
    "targetStudentId": null,
    "dueDate": "2026-09-27"
  },
  {
    "id": "assign-3",
    "courseId": "course-1",
    "title": "Задание 1: Express-сервер",
    "mdPath": "section-2/task-1.md",
    "targetType": "group",
    "targetStudentId": null,
    "dueDate": "2026-10-04"
  },
  {
    "id": "assign-4",
    "courseId": "course-1",
    "title": "Дополнительное задание: Рефакторинг",
    "mdPath": "individual/student-1/extra-task.md",
    "targetType": "individual",
    "targetStudentId": "student-1",
    "dueDate": "2026-10-10"
  }
]
```

Create `src/fixtures/submissions.json`:
```json
[
  {
    "id": "sub-1",
    "assignmentId": "assign-1",
    "studentId": "student-1",
    "files": ["solution.zip"],
    "status": "pending",
    "comment": null,
    "checkedAt": null,
    "parentSubmissionId": null
  },
  {
    "id": "sub-2",
    "assignmentId": "assign-2",
    "studentId": "student-1",
    "files": ["v1.zip"],
    "status": "not_done",
    "comment": "Не хватает merge в main",
    "checkedAt": "2026-09-15T10:00:00.000Z",
    "parentSubmissionId": null
  },
  {
    "id": "sub-3",
    "assignmentId": "assign-2",
    "studentId": "student-1",
    "files": ["v2.zip"],
    "status": "pending",
    "comment": null,
    "checkedAt": null,
    "parentSubmissionId": "sub-2"
  }
]
```

Create `src/fixtures/index.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fixtures tests/fixtures
git commit -m "feat: add fixture data and loader for users/courses/assignments/submissions"
```

---

### Task 5: Sidebar tree builder

**Files:**
- Create: `src/lib/sidebar.js`
- Test: `tests/lib/sidebar.test.js`

**Interfaces:**
- Consumes: `parseSummary` (Task 3), `getAssignments`/`getSubmissions` (Task 4).
- Produces: `buildSidebarTree({ role: 'student'|'teacher', studentId?: string }): Array<{title, path, assignmentId, status, children}>` — consumed by the shared layout partial (Task 6) and every page route (7–11).

- [ ] **Step 1: Write the failing test**

```js
// tests/lib/sidebar.test.js
const test = require('node:test');
const assert = require('node:assert');
const { buildSidebarTree } = require('../../src/lib/sidebar');

test('student tree includes own individual assignment with status', () => {
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-1' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.ok(individualSection);
  assert.strictEqual(individualSection.children[0].assignmentId, 'assign-4');
  assert.strictEqual(individualSection.children[0].status, 'not_submitted');
});

test('other student tree hides individual assignment entirely', () => {
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-2' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.strictEqual(individualSection.children.length, 0);
});

test('teacher tree sees every assignment including individual ones', () => {
  const tree = buildSidebarTree({ role: 'teacher' });
  const individualSection = tree.find((n) => n.title === 'Мои доп. задания');
  assert.strictEqual(individualSection.children.length, 1);
  assert.strictEqual(individualSection.children[0].status, null);
});

test('assignment with a reopened submission reports pending status', () => {
  const tree = buildSidebarTree({ role: 'student', studentId: 'student-1' });
  const section2 = tree.find((n) => n.title === 'Раздел 2');
  const task = section2.children[0];
  assert.strictEqual(task.assignmentId, 'assign-3');
  assert.strictEqual(task.status, 'not_submitted');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../src/lib/sidebar'`

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/sidebar.js
const fs = require('fs');
const path = require('path');
const { parseSummary } = require('./summary-parser');
const { getAssignments, getSubmissions } = require('../fixtures');

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

  return attach(tree);
}

module.exports = { buildSidebarTree };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sidebar.js tests/lib/sidebar.test.js
git commit -m "feat: add sidebar tree builder combining SUMMARY.md with fixtures"
```

---

### Task 6: Auth, session, role guard, and shared layout/theme assets

**Files:**
- Create: `src/middleware/auth.js`
- Create: `src/routes/auth.js`
- Modify: `src/server.js` (mount session already present, add `req.session` usage, mount `auth` router)
- Create: `src/views/login.ejs`
- Create: `src/views/partials/head.ejs`
- Create: `src/views/partials/sidebar.ejs`
- Create: `src/views/partials/scripts.ejs`
- Create: `public/css/theme.css`
- Create: `public/css/components.css`
- Create: `public/js/theme-toggle.js`
- Test: `tests/routes/auth.test.js`

**Interfaces:**
- Consumes: `getUsers()` (Task 4), `buildSidebarTree()` (Task 5).
- Produces: `requireAuth(req, res, next)` and `requireRole(role)` middleware from `src/middleware/auth.js`; `req.session.user = { id, role, name, group? }` set on login — consumed by every page route (7–11). Partials `partials/head`, `partials/sidebar`, `partials/scripts` are included by every subsequent full-page view.

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/auth.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

test('GET /login renders the login form', async () => {
  const app = createApp();
  const res = await request(app).get('/login');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Student ID/);
});

test('POST /login with unknown id re-renders form with an error', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'unknown' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /не найден/);
});

test('POST /login with a valid student id redirects to student dashboard', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'student-1' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/');
});

test('POST /login with a valid teacher id redirects to teacher dashboard', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'teacher-1' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/teacher');
});

test('requireRole blocks access without a session', async () => {
  const app = createApp();
  const res = await request(app).get('/teacher');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/login');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `/login` route does not exist (404), and `/teacher` does not exist either.

- [ ] **Step 3: Write minimal implementation**

```js
// src/middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role !== role) return res.status(403).send('Forbidden');
    next();
  };
}

module.exports = { requireAuth, requireRole };
```

```js
// src/routes/auth.js
const express = require('express');
const { getUsers } = require('../fixtures');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { studentId } = req.body;
  const user = getUsers().find((u) => u.id === studentId);

  if (!user) {
    return res.render('login', { error: 'Пользователь с таким ID не найден' });
  }

  req.session.user = user;
  res.redirect(user.role === 'teacher' ? '/teacher' : '/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
```

Add a placeholder `/teacher` route directly in `src/server.js` for now (Task 9 will replace it with the real teacher dashboard) so the role-guard test has something to hit:

```js
// src/server.js — add near the bottom, before `return app;`
const authRoutes = require('./routes/auth');
const { requireRole } = require('./middleware/auth');

app.use(authRoutes);
app.get('/teacher', requireRole('teacher'), (req, res) => res.send('teacher placeholder'));
```

```html
<!-- src/views/partials/head.ejs -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><%= typeof pageTitle !== 'undefined' ? pageTitle : 'mdtask' %></title>
<link rel="stylesheet" href="/css/theme.css">
<link rel="stylesheet" href="/css/components.css">
<script src="/js/theme-toggle.js" defer></script>
```

```html
<!-- src/views/login.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <%- include('partials/head', { pageTitle: 'Вход' }) %>
</head>
<body class="login-page">
  <main class="login-card">
    <h1>mdtask</h1>
    <% if (error) { %>
      <p class="error"><%= error %></p>
    <% } %>
    <form method="post" action="/login">
      <label for="studentId">Student ID</label>
      <input id="studentId" name="studentId" autofocus>
      <button type="submit">Войти</button>
    </form>
  </main>
</body>
</html>
```

```html
<!-- src/views/partials/sidebar.ejs -->
<nav class="sidebar" id="sidebar">
  <button class="sidebar-toggle" id="sidebarToggle" aria-label="Меню">☰</button>
  <ul class="tree">
    <% sidebarTree.forEach(function renderNode(node) { %>
      <li>
        <% if (node.assignmentId) { %>
          <a href="/assignment/<%= node.assignmentId %>" class="<%= activeAssignmentId === node.assignmentId ? 'active' : '' %>">
            <%= node.title %>
            <% if (node.status) { %><span class="badge badge-<%= node.status %>"></span><% } %>
          </a>
        <% } else { %>
          <span class="tree-section"><%= node.title %></span>
        <% } %>
        <% if (node.children && node.children.length) { %>
          <ul>
            <% node.children.forEach(renderNode) %>
          </ul>
        <% } %>
      </li>
    <% }) %>
  </ul>
  <div class="sidebar-footer">
    <button id="themeToggle">🌓 Тема</button>
    <form method="post" action="/logout"><button type="submit"><%= user.name %> · выйти</button></form>
  </div>
</nav>
```

Note: `renderNode` used as both a named function and inside `forEach` relies on EJS allowing function declarations in `<% %>` blocks — this works because EJS compiles the whole template body into one function scope.

```html
<!-- src/views/partials/scripts.ejs -->
<script src="/js/sidebar.js" defer></script>
```

```css
/* public/css/theme.css */
:root {
  --bg: #fafafa;
  --sidebar-bg: #f7f7f7;
  --text: #1f1f1f;
  --accent: #4183c4;
  --border: #e0e0e0;
}

:root[data-theme="dark"] {
  --bg: #1d1f21;
  --sidebar-bg: #232527;
  --text: #c8c9db;
  --accent: #5ea3e0;
  --border: #333;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: "Source Serif Pro", Georgia, serif;
  line-height: 1.65;
}

code, pre {
  font-family: "Fira Code", "Source Code Pro", monospace;
}
```

```css
/* public/css/components.css */
.login-page { display: flex; align-items: center; justify-content: center; height: 100vh; }
.login-card { border: 1px solid var(--border); padding: 2rem; border-radius: 8px; min-width: 280px; }
.login-card .error { color: #c0392b; }

.app-layout { display: flex; min-height: 100vh; }
.sidebar { width: 280px; background: var(--sidebar-bg); border-right: 1px solid var(--border); padding: 1rem; box-sizing: border-box; }
.sidebar .tree, .sidebar .tree ul { list-style: none; margin: 0; padding-left: 1rem; }
.sidebar .tree { padding-left: 0; }
.sidebar a { display: block; padding: 0.25rem 0; color: var(--text); text-decoration: none; }
.sidebar a.active { border-left: 3px solid var(--accent); padding-left: 0.5rem; font-weight: bold; }
.sidebar-footer { margin-top: 2rem; display: flex; flex-direction: column; gap: 0.5rem; }
.sidebar-toggle { display: none; }

.badge { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 50%; margin-left: 0.4rem; }
.badge-done { background: #2ecc71; }
.badge-not_done { background: #e74c3c; }
.badge-pending { background: #f1c40f; }
.badge-not_submitted { background: #bdc3c7; }

.content { max-width: 800px; margin: 0 auto; padding: 2rem; flex: 1; }

@media (max-width: 700px) {
  .sidebar-toggle { display: block; }
  .sidebar { position: fixed; left: -280px; top: 0; height: 100%; transition: left 0.2s; z-index: 10; }
  .sidebar.open { left: 0; }
}
```

```js
// public/js/theme-toggle.js
(function () {
  const stored = localStorage.getItem('theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'themeToggle') {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', current);
      localStorage.setItem('theme', current);
    }
  });
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/middleware src/routes/auth.js src/server.js src/views public/css public/js tests/routes/auth.test.js
git commit -m "feat: add mock auth, role guard, and shared layout/theme assets"
```

---

### Task 7: Student dashboard

**Files:**
- Create: `src/routes/student.js`
- Create: `src/views/student-dashboard.ejs`
- Modify: `src/server.js` (mount `student` router, remove no longer needed inline `/teacher` placeholder route — keep it as-is, Task 9 will replace it)
- Test: `tests/routes/student.test.js`

**Interfaces:**
- Consumes: `requireRole('student')` (Task 6), `buildSidebarTree` (Task 5), `getCourses`/`getAssignments`/`getSubmissions` (Task 4).
- Produces: `GET /` rendering `student-dashboard.ejs` — this is the redirect target already asserted in Task 6's login test.

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/student.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

async function loginAs(app, studentId) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId });
  return agent;
}

test('student dashboard lists group and individual assignments with badges', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Задание 1: Настройка репозитория/);
  assert.match(res.text, /Дополнительное задание: Рефакторинг/);
  assert.match(res.text, /badge-pending/);
});

test('other student does not see student-1 individual assignment', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');
  const res = await agent.get('/');
  assert.doesNotMatch(res.text, /Дополнительное задание: Рефакторинг/);
});

test('unauthenticated request redirects to login', async () => {
  const app = createApp();
  const res = await request(app).get('/');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/login');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `GET /` not found (404)

- [ ] **Step 3: Write minimal implementation**

```js
// src/routes/student.js
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { getCourses, getAssignments, getSubmissions } = require('../fixtures');

const router = express.Router();

router.get('/', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const sidebarTree = buildSidebarTree({ role: 'student', studentId: user.id });
  const courses = getCourses();
  const submissions = getSubmissions().filter((s) => s.studentId === user.id);

  const assignments = getAssignments()
    .filter((a) => a.targetType === 'group' || a.targetStudentId === user.id)
    .map((a) => {
      const related = submissions.filter((s) => s.assignmentId === a.id);
      const status = related.length ? related[related.length - 1].status : 'not_submitted';
      return { ...a, status };
    });

  res.render('student-dashboard', { user, sidebarTree, courses, assignments, activeAssignmentId: null });
});

module.exports = router;
```

```html
<!-- src/views/student-dashboard.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <%- include('partials/head', { pageTitle: 'Мои задания' }) %>
</head>
<body>
  <div class="app-layout">
    <%- include('partials/sidebar') %>
    <main class="content">
      <h1>Мои задания</h1>
      <% courses.forEach(function (course) { %>
        <h2><%= course.title %></h2>
        <ul class="assignment-list">
          <% assignments.filter(function (a) { return a.courseId === course.id; }).forEach(function (a) { %>
            <li class="assignment-card">
              <a href="/assignment/<%= a.id %>"><%= a.title %></a>
              <span class="badge badge-<%= a.status %>"></span>
              <span class="due-date">до <%= a.dueDate %></span>
              <% if (a.targetType === 'individual') { %><span class="tag">доп. задание</span><% } %>
            </li>
          <% }) %>
        </ul>
      <% }) %>
    </main>
  </div>
  <%- include('partials/scripts') %>
</body>
</html>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/student.js src/views/student-dashboard.ejs src/server.js tests/routes/student.test.js
git commit -m "feat: add student dashboard listing group and individual assignments"
```

---

### Task 8: Assignment view (student)

**Files:**
- Modify: `src/routes/student.js` (add `GET /assignment/:id`)
- Create: `src/views/assignment-view.ejs`
- Create: `src/views/404.ejs`
- Test: `tests/routes/assignment-view.test.js`

**Interfaces:**
- Consumes: `renderMarkdown`/`extractHeadings` (Task 2), `getAssignments`/`getSubmissions` (Task 4), `buildSidebarTree` (Task 5).
- Produces: `GET /assignment/:id` — the URL every sidebar/dashboard assignment link (Tasks 6–7) already points to.

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/assignment-view.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

async function loginAs(app, studentId) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId });
  return agent;
}

test('renders assignment markdown, TOC and upload block', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/assign-1');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<h1>Задание 1: Настройка репозитория<\/h1>/);
  assert.match(res.text, /class="toc"/);
  assert.match(res.text, /class="dropzone"/);
});

test('shows resubmission tabs when a submission has a parent', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/assign-2');
  assert.match(res.text, /Основная сдача/);
  assert.match(res.text, /Пересдача/);
});

test('individual assignment is 404 for a different student', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-2');
  const res = await agent.get('/assignment/assign-4');
  assert.strictEqual(res.status, 404);
});

test('unknown assignment id is 404', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/assignment/does-not-exist');
  assert.strictEqual(res.status, 404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `GET /assignment/:id` not found (404 from Express default, but test asserting body content fails)

- [ ] **Step 3: Write minimal implementation**

Add to `src/routes/student.js` (before `module.exports`):

```js
const path = require('path');
const fs = require('fs');
const { renderMarkdown, extractHeadings } = require('../lib/markdown');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');

router.get('/assignment/:id', requireRole('student'), (req, res) => {
  const user = req.session.user;
  const assignment = getAssignments().find((a) => a.id === req.params.id);

  if (!assignment) return res.status(404).render('404');
  if (assignment.targetType === 'individual' && assignment.targetStudentId !== user.id) {
    return res.status(404).render('404');
  }

  const mdText = fs.readFileSync(path.join(CONTENT_DIR, assignment.mdPath), 'utf-8');
  const html = renderMarkdown(mdText);
  const toc = extractHeadings(mdText);

  const submissions = getSubmissions()
    .filter((s) => s.assignmentId === assignment.id && s.studentId === user.id)
    .sort((a, b) => (a.parentSubmissionId ? 1 : -1));

  const sidebarTree = buildSidebarTree({ role: 'student', studentId: user.id });

  res.render('assignment-view', {
    user,
    sidebarTree,
    assignment,
    html,
    toc,
    submissions,
    activeAssignmentId: assignment.id,
  });
});
```

Register the 404 view handler in `src/server.js` (near the end, after all routers are mounted):
```js
app.use((req, res) => res.status(404).render('404'));
```

```html
<!-- src/views/404.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head><%- include('partials/head', { pageTitle: 'Не найдено' }) %></head>
<body class="login-page">
  <main class="login-card">
    <h1>404</h1>
    <p>Страница не найдена.</p>
    <a href="/">На главную</a>
  </main>
</body>
</html>
```

```html
<!-- src/views/assignment-view.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <%- include('partials/head', { pageTitle: assignment.title }) %>
</head>
<body>
  <div class="app-layout">
    <%- include('partials/sidebar') %>
    <main class="content">
      <nav class="breadcrumbs">Мои задания / <%= assignment.title %></nav>
      <%- html %>

      <section class="submission-block">
        <% if (submissions.length > 1) { %>
          <div class="tabs">
            <button class="tab-btn active" data-tab="main">Основная сдача</button>
            <button class="tab-btn" data-tab="retry">Пересдача</button>
          </div>
        <% } %>
        <% submissions.forEach(function (s) { %>
          <div class="submission-card">
            <span class="badge badge-<%= s.status %>"></span>
            <ul><% s.files.forEach(function (f) { %><li><%= f %></li><% }) %></ul>
            <% if (s.comment) { %><p class="comment"><%= s.comment %></p><% } %>
          </div>
        <% }) %>
        <div class="dropzone">Перетащите файл(ы) сюда или выберите вручную (.zip, .rar)</div>
      </section>
    </main>
    <aside class="toc">
      <h3>На этой странице</h3>
      <ul>
        <% toc.forEach(function (h) { %>
          <li class="toc-level-<%= h.level %>"><a href="#<%= h.slug %>"><%= h.text %></a></li>
        <% }) %>
      </ul>
    </aside>
  </div>
  <%- include('partials/scripts') %>
</body>
</html>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/student.js src/views/assignment-view.ejs src/views/404.ejs src/server.js tests/routes/assignment-view.test.js
git commit -m "feat: add student assignment view with markdown render, TOC and resubmission tabs"
```

---

### Task 9: Teacher dashboard

**Files:**
- Create: `src/routes/teacher.js`
- Create: `src/views/teacher-dashboard.ejs`
- Modify: `src/server.js` (remove the inline `/teacher` placeholder from Task 6, mount `teacher` router instead)
- Test: `tests/routes/teacher.test.js`

**Interfaces:**
- Consumes: `requireRole('teacher')` (Task 6), `getCourses`/`getAssignments` (Task 4), `buildSidebarTree` (Task 5).
- Produces: `GET /teacher` rendering `teacher-dashboard.ejs` — the redirect target already asserted in Task 6's login test.

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/teacher.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test('teacher dashboard lists teacher courses', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Веб-разработка/);
});

test('student cannot access teacher dashboard', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher');
  assert.strictEqual(res.status, 403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — response body is still the Task 6 placeholder text `teacher placeholder`, not the course title.

- [ ] **Step 3: Write minimal implementation**

```js
// src/routes/teacher.js
const express = require('express');
const { requireRole } = require('../middleware/auth');
const { buildSidebarTree } = require('../lib/sidebar');
const { getCourses, getAssignments } = require('../fixtures');

const router = express.Router();

router.get('/teacher', requireRole('teacher'), (req, res) => {
  const user = req.session.user;
  const courses = getCourses().filter((c) => c.teacherId === user.id);
  const assignments = getAssignments();
  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('teacher-dashboard', { user, sidebarTree, courses, assignments, activeAssignmentId: null });
});

module.exports = router;
```

In `src/server.js`, remove the placeholder lines added in Task 6:
```js
app.get('/teacher', requireRole('teacher'), (req, res) => res.send('teacher placeholder'));
```
and replace the `authRoutes` mount block with:
```js
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');

app.use(authRoutes);
app.use(studentRoutes);
app.use(teacherRoutes);
```
(The now-unused `requireRole` import in `server.js` can be removed since routers import it directly.)

```html
<!-- src/views/teacher-dashboard.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <%- include('partials/head', { pageTitle: 'Мои курсы' }) %>
</head>
<body>
  <div class="app-layout">
    <%- include('partials/sidebar') %>
    <main class="content">
      <h1>Мои курсы</h1>
      <% courses.forEach(function (course) { %>
        <h2><%= course.title %></h2>
        <ul class="assignment-list">
          <% assignments.filter(function (a) { return a.courseId === course.id; }).forEach(function (a) { %>
            <li class="assignment-card">
              <a href="/teacher/assignment/<%= a.id %>/edit">Редактировать: <%= a.title %></a>
              <a href="/teacher/assignment/<%= a.id %>/submissions">Сдачи</a>
            </li>
          <% }) %>
        </ul>
      <% }) %>
    </main>
  </div>
  <%- include('partials/scripts') %>
</body>
</html>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/teacher.js src/views/teacher-dashboard.ejs src/server.js tests/routes/teacher.test.js
git commit -m "feat: add teacher dashboard listing owned courses and assignments"
```

---

### Task 10: Assignment editor with live preview

**Files:**
- Modify: `src/routes/teacher.js` (add `GET /teacher/assignment/:id/edit`, `POST /api/preview`)
- Create: `src/views/assignment-editor.ejs`
- Create: `public/js/editor-preview.js`
- Test: `tests/routes/teacher-editor.test.js`

**Interfaces:**
- Consumes: `renderMarkdown` (Task 2), `getAssignments` (Task 4).
- Produces: `GET /teacher/assignment/:id/edit`, `POST /api/preview` (body: `{ markdown: string }`, response: `{ html: string }`) — used by `editor-preview.js`.

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/teacher-editor.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test('editor page renders existing markdown in the textarea', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Настройте локальный репозиторий/);
});

test('POST /api/preview returns rendered html for given markdown', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.post('/api/preview').send({ markdown: '# Привет' });
  assert.strictEqual(res.status, 200);
  assert.match(res.body.html, /<h1>Привет<\/h1>/);
});

test('student cannot reach the editor', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(res.status, 403);
});
```

Note: `content/src/section-1/task-1.md` currently reads "Инициализируйте git-репозиторий проекта..." — update the test's expected substring to match the file created in Task 3 exactly (use "Инициализируйте git-репозиторий" instead of "Настройте локальный репозиторий").

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — routes don't exist yet (404)

- [ ] **Step 3: Write minimal implementation**

Add to `src/routes/teacher.js`:

```js
const fs = require('fs');
const path = require('path');
const { renderMarkdown } = require('../lib/markdown');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content', 'src');

router.get('/teacher/assignment/:id/edit', requireRole('teacher'), (req, res) => {
  const assignment = getAssignments().find((a) => a.id === req.params.id);
  if (!assignment) return res.status(404).render('404');

  const markdown = fs.readFileSync(path.join(CONTENT_DIR, assignment.mdPath), 'utf-8');
  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('assignment-editor', {
    user: req.session.user,
    sidebarTree,
    assignment,
    markdown,
    activeAssignmentId: assignment.id,
  });
});

router.post('/api/preview', requireRole('teacher'), express.json(), (req, res) => {
  const html = renderMarkdown(req.body.markdown || '');
  res.json({ html });
});
```

```html
<!-- src/views/assignment-editor.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <%- include('partials/head', { pageTitle: 'Редактор: ' + assignment.title }) %>
</head>
<body>
  <div class="app-layout">
    <%- include('partials/sidebar') %>
    <main class="content editor-layout">
      <h1>Редактирование: <%= assignment.title %></h1>
      <div class="editor-panes">
        <textarea id="editorSource"><%= markdown %></textarea>
        <div id="editorPreview" class="content"></div>
      </div>
    </main>
  </div>
  <%- include('partials/scripts') %>
  <script src="/js/editor-preview.js" defer></script>
</body>
</html>
```

```js
// public/js/editor-preview.js
(function () {
  const source = document.getElementById('editorSource');
  const preview = document.getElementById('editorPreview');
  if (!source || !preview) return;

  let timer = null;

  async function updatePreview() {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: source.value }),
    });
    const data = await res.json();
    preview.innerHTML = data.html;
  }

  source.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(updatePreview, 300);
  });

  updatePreview();
})();
```

Add `.editor-panes { display: flex; gap: 1rem; } .editor-panes textarea { flex: 1; min-height: 500px; font-family: monospace; } .editor-panes .content { flex: 1; border-left: 1px solid var(--border); padding-left: 1rem; }` to `public/css/components.css`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/teacher.js src/views/assignment-editor.ejs public/js/editor-preview.js public/css/components.css tests/routes/teacher-editor.test.js
git commit -m "feat: add assignment editor with live markdown preview"
```

---

### Task 11: Submissions table with status toggle, comment, and reopen

**Files:**
- Modify: `src/routes/teacher.js` (add `GET /teacher/assignment/:id/submissions`, `POST /teacher/assignment/:id/submissions/:submissionId/status`, `POST /teacher/assignment/:id/submissions/:submissionId/reopen`)
- Create: `src/views/submissions-table.ejs`
- Test: `tests/routes/teacher-submissions.test.js`

**Interfaces:**
- Consumes: `getUsers`/`getSubmissions`/`updateSubmissionStatus`/`reopenSubmission` (Task 4).
- Produces: the three routes above, self-contained (no later task depends on them).

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/teacher-submissions.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());

test('submissions table lists students with current status', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/teacher/assignment/assign-1/submissions');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /badge-pending/);
});

test('posting a status update marks submission done and redirects back', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent
    .post('/teacher/assignment/assign-1/submissions/sub-1/status')
    .send({ status: 'done', comment: 'Отлично' });
  assert.strictEqual(res.status, 302);
  const submission = fixtures.getSubmissions().find((s) => s.id === 'sub-1');
  assert.strictEqual(submission.status, 'done');
  assert.strictEqual(submission.comment, 'Отлично');
});

test('reopen resets a not_done submission to pending', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.post('/teacher/assignment/assign-2/submissions/sub-2/reopen').send({});
  assert.strictEqual(res.status, 302);
  const submission = fixtures.getSubmissions().find((s) => s.id === 'sub-2');
  assert.strictEqual(submission.status, 'pending');
});

test('student cannot reach the submissions table', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/teacher/assignment/assign-1/submissions');
  assert.strictEqual(res.status, 403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — routes don't exist yet (404)

- [ ] **Step 3: Write minimal implementation**

Add to `src/routes/teacher.js`:

```js
const { getUsers, updateSubmissionStatus, reopenSubmission } = require('../fixtures');

router.get('/teacher/assignment/:id/submissions', requireRole('teacher'), (req, res) => {
  const assignment = getAssignments().find((a) => a.id === req.params.id);
  if (!assignment) return res.status(404).render('404');

  const users = getUsers();
  const rows = getSubmissions()
    .filter((s) => s.assignmentId === assignment.id && !s.parentSubmissionId)
    .map((s) => ({ ...s, student: users.find((u) => u.id === s.studentId) }));

  const sidebarTree = buildSidebarTree({ role: 'teacher' });

  res.render('submissions-table', {
    user: req.session.user,
    sidebarTree,
    assignment,
    rows,
    activeAssignmentId: assignment.id,
  });
});

router.post('/teacher/assignment/:id/submissions/:submissionId/status', requireRole('teacher'), (req, res) => {
  updateSubmissionStatus(req.params.submissionId, req.body.status, req.body.comment);
  res.redirect(`/teacher/assignment/${req.params.id}/submissions`);
});

router.post('/teacher/assignment/:id/submissions/:submissionId/reopen', requireRole('teacher'), (req, res) => {
  reopenSubmission(req.params.submissionId);
  res.redirect(`/teacher/assignment/${req.params.id}/submissions`);
});
```

`getAssignments` is already imported at the top of `src/routes/teacher.js` from Task 9; add `getSubmissions` to that same `require('../fixtures')` destructure.

```html
<!-- src/views/submissions-table.ejs -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <%- include('partials/head', { pageTitle: 'Сдачи: ' + assignment.title }) %>
</head>
<body>
  <div class="app-layout">
    <%- include('partials/sidebar') %>
    <main class="content">
      <h1>Сдачи: <%= assignment.title %></h1>
      <table class="submissions-table">
        <thead><tr><th>Студент</th><th>Статус</th><th>Файлы</th><th>Действия</th></tr></thead>
        <tbody>
          <% rows.forEach(function (row) { %>
            <tr>
              <td><%= row.student.name %></td>
              <td><span class="badge badge-<%= row.status %>"></span> <%= row.status %></td>
              <td><%= row.files.join(', ') %></td>
              <td>
                <form method="post" action="/teacher/assignment/<%= assignment.id %>/submissions/<%= row.id %>/status" class="inline-form">
                  <select name="status">
                    <option value="done" <%= row.status === 'done' ? 'selected' : '' %>>Выполнено</option>
                    <option value="not_done" <%= row.status === 'not_done' ? 'selected' : '' %>>Не выполнено</option>
                  </select>
                  <input type="text" name="comment" placeholder="Комментарий" value="<%= row.comment || '' %>">
                  <button type="submit">Сохранить</button>
                </form>
                <% if (row.status === 'not_done') { %>
                  <form method="post" action="/teacher/assignment/<%= assignment.id %>/submissions/<%= row.id %>/reopen">
                    <button type="submit">Разрешить пересдачу</button>
                  </form>
                <% } %>
              </td>
            </tr>
          <% }) %>
        </tbody>
      </table>
    </main>
  </div>
  <%- include('partials/scripts') %>
</body>
</html>
```

Add to `public/css/components.css`: `.submissions-table { width: 100%; border-collapse: collapse; } .submissions-table td, .submissions-table th { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; } .inline-form { display: flex; gap: 0.5rem; }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/teacher.js src/views/submissions-table.ejs public/css/components.css tests/routes/teacher-submissions.test.js
git commit -m "feat: add submissions table with status update and reopen actions"
```

---

### Task 12: Mobile sidebar toggle and full cross-role smoke test

**Files:**
- Create: `public/js/sidebar.js`
- Test: `tests/routes/smoke.test.js`

**Interfaces:**
- Consumes: nothing new — this task only adds the client-side sidebar toggle referenced by `partials/scripts.ejs` since Task 6, and a final integration test exercising every route added in Tasks 1–11 together.

- [ ] **Step 1: Write the failing test**

```js
// tests/routes/smoke.test.js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const fixtures = require('../../src/fixtures');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id });
  return agent;
}

test.beforeEach(() => fixtures.__resetForTests());

test('full student journey: dashboard -> assignment -> logout', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const dashboard = await agent.get('/');
  assert.strictEqual(dashboard.status, 200);

  const assignment = await agent.get('/assignment/assign-1');
  assert.strictEqual(assignment.status, 200);

  const logout = await agent.post('/logout');
  assert.strictEqual(logout.status, 302);
  assert.strictEqual(logout.headers.location, '/login');

  const afterLogout = await agent.get('/');
  assert.strictEqual(afterLogout.status, 302);
});

test('full teacher journey: dashboard -> editor -> submissions -> status update', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');

  const dashboard = await agent.get('/teacher');
  assert.strictEqual(dashboard.status, 200);

  const editor = await agent.get('/teacher/assignment/assign-1/edit');
  assert.strictEqual(editor.status, 200);

  const submissions = await agent.get('/teacher/assignment/assign-1/submissions');
  assert.strictEqual(submissions.status, 200);

  const update = await agent
    .post('/teacher/assignment/assign-1/submissions/sub-1/status')
    .send({ status: 'done', comment: 'Готово' });
  assert.strictEqual(update.status, 302);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — request to `public/js/sidebar.js` is a static 404 in the browser only, not in this test; the test itself should already pass at this point since all routes exist from Tasks 6–11. Run it first to confirm — if it already passes, skip straight to Step 4 and note that this task is adding the missing static asset only.

- [ ] **Step 3: Write minimal implementation**

```js
// public/js/sidebar.js
(function () {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
  });
})();
```

Add `<script src="/js/sidebar.js" defer></script>` inside `src/views/partials/scripts.ejs` if not already present (it was added there in Task 6 — verify and leave as-is if so).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all test files, full suite)

- [ ] **Step 5: Manual browser verification**

```bash
npm run dev
```

Open `http://localhost:3000/login` and manually verify:
- Login as `student-1` → dashboard shows 4 items (3 group + 1 individual), correct badges.
- Open an assignment → markdown renders, TOC on the right lists headings, dropzone is visible.
- Open `assign-2` → "Основная сдача"/"Пересдача" tabs both render.
- Toggle theme button → colors switch and persist on reload (localStorage).
- Resize window below 700px → hamburger button appears and opens/closes the sidebar.
- Logout, login as `student-2` → confirm the individual assignment is completely absent from the sidebar and dashboard, and `http://localhost:3000/assignment/assign-4` is a 404 page.
- Login as `teacher-1` → dashboard, editor (typing in the textarea updates the preview pane), and submissions table (status dropdown + comment + "Разрешить пересдачу" for `not_done` rows) all work.

- [ ] **Step 6: Commit**

```bash
git add public/js/sidebar.js tests/routes/smoke.test.js
git commit -m "test: add cross-role smoke test and mobile sidebar toggle script"
```

---

## Self-Review Notes

- **Spec coverage:** login mock (Task 6), student dashboard + badges (Task 7), assignment view with MD/TOC/dropzone/resubmission tabs (Task 8), teacher dashboard (Task 9), two-pane editor with live preview (Task 10), submissions table with status/comment/reopen (Task 11), theme system + mobile sidebar (Tasks 6, 12), 404 handling and role-based access checks (Tasks 6, 8, 9, 11) — every screen and cross-cutting concern from the spec has a task.
- **No persistence beyond process lifetime** is intentional per spec ("Не входит: реальная загрузка... сохранение состояния между запросами" is out of scope beyond the in-memory mutation demoed in Task 11) — matches "Что дальше" section deferring real storage to Stage 1.
- **Type/interface consistency checked:** `buildSidebarTree({ role, studentId })` signature is identical across Tasks 5–11; `renderMarkdown`/`extractHeadings` signatures from Task 2 are used unchanged in Tasks 8 and 10; fixture function names (`getUsers`, `getCourses`, `getAssignments`, `getSubmissions`, `updateSubmissionStatus`, `reopenSubmission`, `__resetForTests`) are identical everywhere they're consumed.
