// Серверная перепроверка CSS (src/lib/css-course/cascade.js), признаки набора кода (src/lib/typing-check.js) и разбор
// ошибок HTML (src/lib/emmet/validate.js explainAttempt). Сверка движка с браузером на всех заданиях и их вариантах —
// scripts/css-course/verify-server.js (нужен браузер).
const test = require('node:test');
const assert = require('node:assert');
const { checkCss, parseColor, parseSelector, matchesSelector, buildDocument } = require('../../src/lib/css-course/cascade');
const course = require('../../src/lib/css-course');
const typing = require('../../src/lib/typing-check');
const { explainAttempt } = require('../../src/lib/emmet/validate');

const task = (html, css, extra = {}) => ({ html, css, widths: [800], states: [], ...extra });
const ok = (t, css) => checkCss(t, css).ok;

test('colors: names, hex, rgb, hsl and transparency become one form', () => {
  const red = 'rgba(255,0,0,1)';
  for (const c of ['red', '#f00', '#FF0000', 'rgb(255, 0, 0)', 'rgb(255 0 0)', 'rgba(255,0,0,1)', 'hsl(0, 100%, 50%)', 'hsl(0deg 100% 50%)']) assert.strictEqual(parseColor(c), red, c);
  assert.strictEqual(parseColor('rgba(0, 0, 0, .5)'), 'rgba(0,0,0,0.5)');
  assert.strictEqual(parseColor('#00000080'), 'rgba(0,0,0,0.5)');
  assert.strictEqual(parseColor('transparent'), 'rgba(0,0,0,0)');
  assert.strictEqual(parseColor('redd'), null);
});

test('selectors: specificity and matching (combinators, attributes, :nth-child, :not, :where)', () => {
  assert.deepStrictEqual(parseSelector('#main .post > p.text:first-child').specificity, [1, 3, 1]);
  assert.deepStrictEqual(parseSelector(':where(.a .b) p').specificity, [0, 0, 1]);
  assert.deepStrictEqual(parseSelector('a:not(.x, #y)').specificity, [1, 0, 1]);
  const doc = buildDocument('<ul class="list"><li>1</li><li class="x">2</li><li>3</li></ul><p><a href="file.pdf">PDF</a></p>');
  const env = { width: 800, height: 700, states: [], checked: new Set() };
  const find = (sel) => doc.elements.filter((n) => matchesSelector(n, parseSelector(sel), env)).length;
  assert.strictEqual(find('.list > li'), 3);
  assert.strictEqual(find('li:nth-child(odd)'), 2);
  assert.strictEqual(find('li:not(.x)'), 2);
  assert.strictEqual(find('li.x + li'), 1);
  assert.strictEqual(find('li.x ~ li'), 1);
  assert.strictEqual(find('a[href$=".pdf"]'), 1);
  assert.strictEqual(find('body p a'), 1);
  assert.strictEqual(find('ul p'), 0);
});

test('cascade: order, specificity, !important, inheritance, inherit, var(), @media, shorthands', () => {
  const html = '<div class="card"><p class="text">Привет</p><button>OK</button></div>';
  // равнозначные записи
  assert.ok(ok(task(html, '.text { color: #CA2851; }'), 'p { color: rgb(202, 40, 81); }'));
  assert.ok(ok(task(html, '.card { border: 2px solid red; }'), '.card { border-width: 2px; border-style: solid; border-color: #f00; }'));
  assert.ok(ok(task(html, '.card { background-color: #FFF3E6; }'), '.card { background: #FFF3E6; }'));
  assert.ok(ok(task(html, 'p { font-weight: 700; }'), 'p { font-weight: bold; }'));
  assert.ok(ok(task(html, '.card { color: #1F3F66; }'), ':root { --c: #1F3F66; } .card { color: var(--c); }'));
  assert.ok(ok(task(html, '.card { border-radius: 12px; }'), '.card { border-radius: 0.75rem; }'));
  // наследование: цвет у родителя = цвет у ребёнка
  assert.ok(ok(task(html, '.card { color: #333333; }'), '.card { color: #333; } .text { color: inherit; }'));
  // порядок и вес
  assert.ok(ok(task(html, 'p { color: blue; }'), 'p { color: red; } p { color: blue; }'));
  assert.ok(!ok(task(html, 'p { color: blue; }'), '.card .text { color: red; } p { color: blue; }'));
  assert.ok(ok(task(html, 'p { color: blue; }'), '.card .text { color: red; } p { color: blue !important; }'));
  // кнопка не наследует шрифт, пока не font: inherit
  const btn = task(`<style>body { font-size: 20px; }</style>${html}`, 'button { font: inherit; }');
  assert.ok(!ok(btn, ''));
  assert.ok(ok(btn, 'button { font: inherit; }'));
  // чужие стили в разметке подключены после CSS студента
  const theirs = task(`<style>p { color: gray; }</style>${html}`, '.card p { color: green; }');
  assert.ok(!ok(theirs, 'p { color: green; }'));
  assert.ok(ok(theirs, '.card p { color: green; }'));
  // @media — на каждой ширине задания
  const resp = task(html, '@media (max-width: 600px) { p { color: red; } }', { widths: [375, 1200] });
  assert.ok(ok(resp, '@media (max-width: 599px) { .text { color: #ff0000; } }'));
  assert.ok(!ok(resp, 'p { color: red; }'));
  // состояния
  const hover = task(html, 'button:hover { background: black; }', { states: [{ selector: 'button', state: 'hover' }] });
  assert.ok(!ok(hover, 'button { background: black; }'));
  assert.ok(ok(hover, 'button:hover { background-color: #000; }'));
  const diff = checkCss(task(html, '.text { color: red; }'), '.text { color: blue; }');
  assert.strictEqual(diff.diffs[0].prop, 'цвет текста');
});

test('every reference passes the server recheck; empty CSS fails every task on styles or layout', () => {
  for (const t of course.TOPICS.flatMap((x) => x.tasks)) {
    const ref = checkCss(t, t.css);
    assert.ok(ref.ok && ref.layoutDiffs.length === 0, `${t.id}: ${JSON.stringify(ref.diffs[0] || ref.layoutDiffs[0])}`);
    const empty = checkCss(t, '');
    assert.ok(!empty.ok || empty.layoutDiffs.length, `${t.id}: пустой CSS не отличается`);
  }
});

test('typing flags: chunk, autotype, untyped, copy of the reference', () => {
  const human = { final: 120, restored: 0, typed: 118, emmet: 0, auto: 4, other: 0, deletes: 6, undos: 0, bigInserts: 0, biggest: 0, keys: 110, meanMs: 180, medianMs: 160, cv: 0.7, rcv: 0.45, activeMs: 40000 };
  assert.deepStrictEqual(typing.typingFlags(typing.sanitize(human), 'x'.repeat(120)), []);
  assert.deepStrictEqual(typing.typingFlags(typing.sanitize({ ...human, typed: 10, other: 110, bigInserts: 1, biggest: 110 }), 'x'.repeat(120)), ['chunk', 'untyped']);
  assert.deepStrictEqual(typing.typingFlags(typing.sanitize({ ...human, rcv: 0.05 }), 'x'.repeat(120)), ['autotype']);
  assert.deepStrictEqual(typing.typingFlags(typing.sanitize({ ...human, medianMs: 38 }), 'x'.repeat(120)), ['autotype'], 'нечеловечески быстро');
  const reference = 'h1 { color: #CA2851; font-size: 40px; text-align: center; }';
  assert.deepStrictEqual(typing.typingFlags(null, reference + '\n', { reference }), ['refCopy']);
  assert.deepStrictEqual(typing.typingFlags(null, 'h1 {\n  color: #CA2851;\n  font-size: 40px;\n  text-align: center;\n}', { reference }), [], 'то же, но своё оформление — не копия');
  assert.deepStrictEqual(typing.typingFlags(null, 'h1 { color: #ca2851; }', { reference: 'h1 { color: #CA2851; }' }), [], 'короткие решения не проверяются');
  assert.strictEqual(typing.sanitize('плохо'), null);
  const progress = new Map([['a', { typing: { chunk: 2 } }], ['b', { typing: { autotype: 1 } }]]);
  assert.strictEqual(typing.typingSignal(progress), 'код не руками: готовый кусок кода ×2, ровный «автонабор»');
  const same = typing.sameSolutions([
    { studentId: 's1', progress: new Map([['t', { solvedCode: '.a { color: red; background: blue; border: 1px solid green; padding: 4px; }' }]]) },
    { studentId: 's2', progress: new Map([['t', { solvedCode: '.a{color:red;background:blue;border:1px solid green;padding:4px;}' }]]) },
  ], ['t']);
  assert.deepStrictEqual(same.s1, [{ taskId: 't', others: ['s2'] }]);
});

test('HTML explanation: missing / extra / wrong element, attributes, classes, text', () => {
  const ex = { mode: 'html', expectedHtml: '<ul class="menu list"><li><a href="/">Главная</a></li><li>Меню</li></ul><p>Привет</p>' };
  assert.deepStrictEqual(explainAttempt('<ul class="menu list"><li><a href="/">Главная</a></li></ul><p>Привет</p>', ex), ['внутри <ul class="list menu">: не хватает элемента <li> (2-й по счёту).']);
  assert.deepStrictEqual(explainAttempt('<ol><li>x</li></ol><p>Привет</p>', ex), ['на верхнем уровне: 1-й элемент должен быть <ul>, а у вас <ol>.']);
  const details = explainAttempt('<ul class="menu"><li><a>Главная</a></li><li>Меню</li></ul><p>Пока</p>', ex);
  assert.deepStrictEqual(details, ['У <ul class="menu"> не хватает класса «list».', 'У <a> нет атрибута href.', 'Текст в <p> отличается от образца: «Пока».']);
  assert.deepStrictEqual(explainAttempt(ex.expectedHtml, ex), []);
  assert.match(explainAttempt('<ul><li>', ex)[0], /не закрыт/);
});
