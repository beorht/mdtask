// Builds the printable materials for the SQL topic "Связи между таблицами" as HTML pages that
// are then turned into PDF with WeasyPrint:
//   theory.html   — the live theory markdown (src/content/sql-theory-relations.js)
//   practice.html — SQL tasks picked from the trainer (with their starting database, no
//                   solutions) plus a design task: an ER diagram in draw.io.
//
// Usage (from the project root):
//   node scripts/build-relations-pdf.js <outDir>
//   weasyprint <outDir>/theory.html   docs/materials/SQL-svyazi-mezhdu-tablicami-teoriya.pdf
//   weasyprint <outDir>/practice.html docs/materials/SQL-svyazi-mezhdu-tablicami-praktika.pdf
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { renderMarkdown } = require('../src/lib/markdown');
const { TOPIC_THEORY } = require('../src/content/sql-theory');
const exercises = require('../src/db/sql-exercises-relations-data');

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node scripts/build-relations-pdf.js <outDir>');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

// Trainer tasks for the handout, from basic to harder.
const PICK = [
  'relations-1', // один ко многим (CREATE TABLE)
  'relations-2', // многие ко многим (CREATE TABLE)
  'relations-3', // запись по идентификаторам (INSERT)
  'relations-5', // выборка через вложенные запросы (SELECT)
  'relations-6', // один к одному (CREATE TABLE + UNIQUE)
  'relations-11', // NOT IN: курсы без студентов (SELECT)
  'relations-12', // HAVING во вложенном запросе (SELECT)
];

const hljsCss = fs.readFileSync(require.resolve('highlight.js/styles/github.css'), 'utf-8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
  @bottom-left { content: string(doc-title); font: 8.5pt "Open Sans"; color: #8a847b; }
  @bottom-right { content: counter(page) " / " counter(pages); font: 8.5pt "Open Sans"; color: #8a847b; }
}
html { font-family: "Open Sans", "DejaVu Sans", sans-serif; font-size: 10.5pt; color: #202124; line-height: 1.5; }
body { margin: 0; }
.doc-head { border-bottom: 2px solid #665477; padding-bottom: 8pt; margin-bottom: 14pt; }
.doc-kicker { font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: #665477; font-weight: 700; margin: 0 0 3pt; }
.doc-title { font-size: 20pt; font-weight: 700; margin: 0; line-height: 1.2; string-set: doc-title content(); }
.doc-sub { color: #6f6b64; margin: 4pt 0 0; }
h1 { display: none; } /* the theory markdown repeats the title; the doc header already shows it */
h2 { font-size: 14pt; color: #443752; margin: 18pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid #ddd5c9; break-after: avoid; }
h3 { font-size: 12pt; margin: 14pt 0 5pt; break-after: avoid; }
p { margin: 0 0 7pt; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
li { margin-bottom: 2pt; }
strong { color: #111; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.8pt; background: #f1ece3; padding: 0 2.5pt; border-radius: 2pt; }
pre { background: #f7f4ee; border: 1px solid #e3dcd0; border-left: 3px solid #665477; border-radius: 3pt; padding: 7pt 9pt; margin: 0 0 9pt; break-inside: avoid; white-space: pre-wrap; }
pre code { background: none; padding: 0; font-size: 8.6pt; line-height: 1.4; }
table { border-collapse: collapse; margin: 0 0 9pt; font-size: 9.2pt; break-inside: avoid; }
th, td { border: 1px solid #d8d0c3; padding: 3pt 7pt; text-align: left; vertical-align: top; }
th { background: #ede7f0; font-weight: 700; }
blockquote { margin: 0 0 9pt; padding: 6pt 10pt; border-left: 3px solid #a94f36; background: #faf3ee; }
img { display: none; }
.task { margin: 0 0 14pt; }
.task + .task { break-before: page; }
.task-head { display: flex; align-items: baseline; gap: 8pt; border-bottom: 1px solid #ddd5c9; padding-bottom: 4pt; margin-bottom: 8pt; }
.task-num { background: #665477; color: #fff; font-weight: 700; border-radius: 3pt; padding: 1pt 7pt; font-size: 10pt; }
.task-title { font-size: 13pt; font-weight: 700; margin: 0; border: 0; padding: 0; color: #202124; }
.task-type { margin-left: auto; font-size: 8.5pt; color: #6f6b64; border: 1px solid #d8d0c3; border-radius: 8pt; padding: 0 6pt; white-space: nowrap; }
.label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .06em; color: #6f6b64; font-weight: 700; margin: 10pt 0 4pt; break-after: avoid; }
.tables { display: flex; flex-wrap: wrap; gap: 4pt 14pt; align-items: flex-start; }
.tables table { margin-bottom: 4pt; }
.tbl-name { font-family: "DejaVu Sans Mono", monospace; font-size: 9pt; font-weight: 700; margin: 0 0 2pt; }
.cols { font-size: 8.4pt; color: #6f6b64; margin: 0 0 3pt; }
.answer { border: 1px dashed #b8afa2; border-radius: 3pt; height: 48mm; margin-top: 6pt; position: relative; break-inside: avoid; }
.answer::before { content: "Ваш SQL-запрос"; position: absolute; top: 4pt; left: 7pt; font-size: 8pt; color: #a29a8e; }
.intro { background: #f7f4ee; border: 1px solid #e3dcd0; border-radius: 3pt; padding: 6pt 10pt; margin-bottom: 10pt; font-size: 9.5pt; }
.intro p:last-child, .intro ul:last-child { margin-bottom: 0; }
.spec { width: 100%; }
.spec td:first-child { font-family: "DejaVu Sans Mono", monospace; font-size: 8.6pt; white-space: nowrap; }
.spec td:nth-child(2), .spec td:nth-child(3) { white-space: nowrap; }
.spec-name { font-family: "DejaVu Sans Mono", monospace; font-size: 10.5pt; font-weight: 700; margin: 10pt 0 2pt; break-after: avoid; }
.spec-desc { margin: 0 0 4pt; color: #444; break-after: avoid; }
.checklist li { list-style: none; margin-left: -12pt; }
.checklist li::before { content: "☐  "; font-family: "DejaVu Sans"; }
${hljsCss}
`;

function page(title, kicker, sub, body) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head>
<body><header class="doc-head"><p class="doc-kicker">${esc(kicker)}</p><p class="doc-title">${esc(title)}</p><p class="doc-sub">${esc(sub)}</p></header>
${body}</body></html>`;
}

function taskHead(num, title, type) {
  return `<div class="task-head"><span class="task-num">${num}</span><h2 class="task-title">${esc(title)}</h2><span class="task-type">${esc(type)}</span></div>`;
}

// ---------- theory ----------
const theory = TOPIC_THEORY.relations;
fs.writeFileSync(
  path.join(outDir, 'theory.html'),
  page(theory.title, 'SQL · Теоретический материал', 'Зачем разделять данные на таблицы и как проектировать связи между ними', renderMarkdown(theory.md))
);

// ---------- practice: SQL tasks ----------
function describeDatabase(schemaSql) {
  const conn = new Database(':memory:');
  conn.exec(schemaSql);
  const tables = conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").all().map((r) => r.name);
  const html = tables
    .map((t) => {
      const cols = conn.prepare(`PRAGMA table_info(${t})`).all();
      const fks = conn.prepare(`PRAGMA foreign_key_list(${t})`).all();
      const colText = cols
        .map((c) => {
          const fk = fks.find((f) => f.from === c.name);
          let s = `${c.name} ${c.type}`;
          if (c.pk) s += ' PK';
          if (fk) s += ` → ${fk.table}.${fk.to || 'id'}`;
          return s;
        })
        .join(', ');
      const rows = conn.prepare(`SELECT * FROM ${t}`).all();
      const head = cols.map((c) => `<th>${esc(c.name)}</th>`).join('');
      const body = rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c.name])}</td>`).join('')}</tr>`).join('');
      return `<div><p class="tbl-name">${esc(t)}</p><p class="cols">${esc(colText)}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    })
    .join('');
  conn.close();
  return `<div class="tables">${html}</div>`;
}

const sqlTasks = PICK.map((id, i) => {
  const ex = exercises.find((e) => e.id === id);
  if (!ex) throw new Error(`exercise ${id} not found`);
  return `<section class="task">
  ${taskHead(i + 1, ex.title, ex.allowedStatement)}
  ${renderMarkdown(ex.descriptionMd)}
  <p class="label">Что уже есть в базе данных</p>
  ${describeDatabase(ex.schemaSql)}
  <div class="answer"></div>
</section>`;
});

// ---------- practice: design task (ER diagram in draw.io) ----------
const DESIGN_TABLES = [
  {
    name: 'categories',
    title: 'Категории товаров',
    desc: 'Справочник категорий каталога: «Электроника», «Мебель», «Книги»… Каждая категория записана один раз; товары ссылаются на неё по id.',
    cols: [
      ['id', 'INTEGER', 'PRIMARY KEY', 'Уникальный номер категории'],
      ['name', 'TEXT', 'NOT NULL, UNIQUE', 'Название категории — не может повторяться'],
      ['description', 'TEXT', '—', 'Краткое описание категории (может быть пустым)'],
    ],
    sample: 'Пример строки: (1, \'Электроника\', \'Компьютеры, телефоны и аксессуары\')',
  },
  {
    name: 'suppliers',
    title: 'Поставщики',
    desc: 'Компании, которые привозят товары в магазин. Один поставщик может поставлять много разных товаров.',
    cols: [
      ['id', 'INTEGER', 'PRIMARY KEY', 'Уникальный номер поставщика'],
      ['name', 'TEXT', 'NOT NULL', 'Название компании'],
      ['phone', 'TEXT', '—', 'Контактный телефон'],
      ['city', 'TEXT', 'NOT NULL', 'Город, из которого идут поставки'],
    ],
    sample: 'Пример строки: (1, \'ООО «ТехноОпт»\', \'+998 71 123-45-67\', \'Ташкент\')',
  },
  {
    name: 'products',
    title: 'Товары',
    desc: 'Каталог товаров. У каждого товара ровно одна категория и ровно один поставщик — они хранятся не названиями, а ссылками (внешними ключами).',
    cols: [
      ['id', 'INTEGER', 'PRIMARY KEY', 'Уникальный номер товара'],
      ['name', 'TEXT', 'NOT NULL', 'Название товара'],
      ['price', 'REAL', 'NOT NULL, CHECK (price > 0)', 'Цена за единицу'],
      ['quantity', 'INTEGER', 'NOT NULL, DEFAULT 0', 'Остаток на складе'],
      ['category_id', 'INTEGER', 'NOT NULL, FK → categories.id', 'Категория товара'],
      ['supplier_id', 'INTEGER', 'NOT NULL, FK → suppliers.id', 'Поставщик товара'],
    ],
    sample: 'Пример строки: (1, \'Ноутбук\', 55000, 10, 1, 1)',
  },
];

const designSpec = DESIGN_TABLES.map(
  (t) => `<p class="spec-name">${esc(t.name)} — ${esc(t.title)}</p>
<p class="spec-desc">${esc(t.desc)}</p>
<table class="spec"><thead><tr><th>Столбец</th><th>Тип</th><th>Ограничения</th><th>Описание</th></tr></thead><tbody>
${t.cols.map((c) => `<tr>${c.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
</tbody></table>
<p class="cols">${esc(t.sample)}</p>`
).join('');

const designNum = PICK.length + 1;
const designTask = `<section class="task">
  ${taskHead(designNum, 'Схема связей трёх таблиц интернет-магазина в draw.io', 'СХЕМА')}
  <p>Интернет-магазину нужна база данных для каталога товаров. В ней три таблицы: <strong>категории</strong>, <strong>поставщики</strong> и <strong>товары</strong>. Ниже описаны их столбцы и связи.</p>
  <p><strong>Задача:</strong> нарисуйте ER-диаграмму (схему связей) этих таблиц в <strong>draw.io</strong> (сайт <code>app.diagrams.net</code>) или в похожей программе для схем.</p>

  <p class="label">Характеристики таблиц</p>
  ${designSpec}

  <p class="label">Описание связей</p>
  <table class="spec"><thead><tr><th>Связь</th><th>Тип</th><th>Где внешний ключ</th><th>Смысл</th></tr></thead><tbody>
    <tr><td>categories → products</td><td>один ко многим (1 : N)</td><td>products.category_id</td><td>В одной категории много товаров, у товара одна категория</td></tr>
    <tr><td>suppliers → products</td><td>один ко многим (1 : N)</td><td>products.supplier_id</td><td>Поставщик привозит много товаров, у товара один поставщик</td></tr>
  </tbody></table>

  <p class="label">Как нарисовать в draw.io</p>
  <ol>
    <li>Откройте <code>app.diagrams.net</code> → «Create New Diagram» → «Blank Diagram».</li>
    <li>Слева в библиотеке фигур включите раздел <strong>Entity Relation</strong> («Ещё фигуры» → Entity Relation). Перетащите фигуру <strong>Table</strong> для каждой из трёх таблиц.</li>
    <li>В каждой таблице: заголовок — имя таблицы, строки — столбцы с типами. Отметьте первичный ключ меткой <strong>PK</strong>, внешние ключи — меткой <strong>FK</strong>.</li>
    <li>Соедините таблицы линиями <strong>от внешнего ключа к первичному ключу</strong>: <code>products.category_id → categories.id</code> и <code>products.supplier_id → suppliers.id</code>.</li>
    <li>Для линий выберите стрелки нотации «гусиная лапка» (crow's foot): со стороны <code>categories</code> и <code>suppliers</code> — «ровно один», со стороны <code>products</code> — «много». Подпишите на линиях <strong>1</strong> и <strong>N</strong>.</li>
    <li>Под схемой добавьте текстовый блок: 2–3 предложения о том, зачем категории и поставщики вынесены в отдельные таблицы.</li>
    <li>Сохраните файл как <code>.drawio</code> и экспортируйте в <code>.png</code> (File → Export as → PNG).</li>
  </ol>
  <p><em>Подсказка:</em> в draw.io есть Arrange → Insert → Advanced → SQL. Если вставить туда CREATE TABLE этих таблиц, программа сама нарисует заготовки таблиц. Связи и подписи всё равно нужно добавить вручную.</p>

  <p class="label">Что сдать и как будет проверяться</p>
  <ul class="checklist">
    <li>Есть все три таблицы со всеми столбцами и типами из характеристик выше.</li>
    <li>Первичные ключи отмечены PK, внешние ключи — FK.</li>
    <li>Две связи нарисованы от внешнего ключа к первичному ключу, с обозначением «1» и «N» (или «гусиными лапками»).</li>
    <li>Нет лишних связей: categories и suppliers между собой не связаны.</li>
    <li>Есть короткое описание: зачем данные разделены на три таблицы.</li>
    <li>Сданы два файла: <code>.drawio</code> и <code>.png</code>.</li>
  </ul>
  <p class="label">Дополнительно (по желанию)</p>
  <p>Добавьте на схему четвёртую таблицу <code>orders</code> (заказы) и таблицу-связку <code>order_items</code> (товары в заказе: <code>order_id</code>, <code>product_id</code>, <code>quantity</code>). Покажите связь «многие ко многим» между заказами и товарами.</p>
</section>`;

const intro = `<div class="intro">
<p><strong>Задания 1–${PICK.length}</strong> — SQL на учебной базе колледжа: группы (<code>groups</code>), студенты (<code>students</code>), курсы (<code>courses</code>) и записи на курсы (<code>enrollments</code>). <strong>Задание ${designNum}</strong> — проектирование: схема связей таблиц интернет-магазина в draw.io.</p>
<ul>
<li>В каждом SQL-задании нужно написать <strong>один</strong> запрос указанного типа. Перед заданием показано, какие таблицы и данные уже есть в базе.</li>
<li>Проверка внешних ключей включена (<code>PRAGMA foreign_keys = ON</code>).</li>
<li>SQL-задания можно решить и проверить в SQL-тренажёре: тема «Связи между таблицами».</li>
</ul></div>`;

fs.writeFileSync(
  path.join(outDir, 'practice.html'),
  page(
    'Связи между таблицами: практика',
    'SQL · Практические задания',
    `${PICK.length + 1} заданий: от одной связи «один ко многим» до подсчётов по таблице-связке и схемы базы в draw.io`,
    intro + sqlTasks.join('\n') + designTask
  )
);
console.log(`ok: ${outDir}/theory.html, ${outDir}/practice.html (${PICK.length} SQL tasks + 1 design task)`);
