// Серверная перепроверка решений тренажёра Emmet: те же правила, что у клиента
// (emmet/src/services/ValidationService.js), но без DOM. Разбор HTML — свой небольшой токенайзер,
// повторяющий то, что важно для сравнения: дерево элементов, атрибуты (class — отсортированные классы),
// текст элемента без пробельных узлов, а также поправки браузера (неявный <tbody> у <tr> в <table>,
// <p> закрывается блочным элементом). Ручной ввод HTML определяет только браузер — сервер получает признак.

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const CLOSES_P = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer',
  'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre',
  'section', 'table', 'ul',
]);
const TAG_PATTERN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR_PATTERN = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const STATUS = { success: 'success', partial: 'partial', error: 'error', mismatch: 'mismatch' };

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

function countQuotes(text) {
  const stripped = text.replace(/"[^"]*"|'[^']*'/g, '');
  return (stripped.match(/["']/g) || []).length;
}

/** Незакрытые и лишние теги — браузерный парсер такие ошибки молча исправляет. */
function findMarkupErrors(source) {
  const errors = [];
  const stack = [];
  for (const match of source.matchAll(TAG_PATTERN)) {
    const [whole, closing, rawName, rest] = match;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (closing) {
      const openIndex = stack.lastIndexOf(name);
      if (openIndex === -1) {
        errors.push(`Лишний закрывающий тег </${name}> — для него нет открывающего.`);
        continue;
      }
      for (const unclosed of stack.splice(openIndex).slice(1).reverse()) errors.push(`Тег <${unclosed}> не закрыт до </${name}>.`);
      continue;
    }
    if (countQuotes(rest) % 2 !== 0) errors.push(`В теге <${name}> не закрыта кавычка у атрибута.`);
    if (!VOID_TAGS.has(name) && !whole.endsWith('/>')) stack.push(name);
  }
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  if (/<\/?[a-zA-Z][^>]*$/.test(withoutComments)) errors.push('Последний тег оборван — не хватает символа >.');
  for (const unclosed of stack.reverse()) errors.push(`Тег <${unclosed}> открыт, но не закрыт.`);
  return errors;
}

const collapse = (text) => text.replace(/\s+/g, ' ').trim();
const normalizeClasses = (value) => value.split(/\s+/).filter(Boolean).sort().join(' ');

function parseAttrs(rest) {
  const attrs = new Map();
  for (const m of rest.replace(/\/\s*$/, '').matchAll(ATTR_PATTERN)) {
    const name = m[1].toLowerCase();
    if (attrs.has(name)) continue; // браузер оставляет первый
    const raw = m[2] ?? m[3] ?? m[4] ?? '';
    const value = decode(raw);
    attrs.set(name, name === 'class' ? normalizeClasses(value) : value);
  }
  return attrs;
}

/** HTML → дерево { tag, attrs, text, children } без пробельных узлов (как parseTree у клиента). */
function parseTree(html) {
  const root = { tag: '#root', children: [], texts: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const open = (tag, attrs) => {
    const node = { tag, attrs, children: [], texts: [] };
    top().children.push(node);
    return node;
  };
  const closeTo = (index) => stack.splice(index);
  let last = 0;
  for (const match of html.matchAll(TAG_PATTERN)) {
    const text = html.slice(last, match.index);
    if (text) top().texts.push(decode(text));
    last = match.index + match[0].length;
    const [whole, closing, rawName, rest] = match;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (closing) {
      let index = -1;
      for (let i = stack.length - 1; i > 0; i -= 1) if (stack[i].tag === name) { index = i; break; }
      if (index !== -1) closeTo(index);
      else if (name === 'p') open('p', new Map()); // лишний </p> браузер превращает в пустой <p>
      continue;
    }
    if (CLOSES_P.has(name)) {
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === 'p') { closeTo(i); break; }
        if (!['b', 'i', 'em', 'strong', 'span', 'a', 'small', 'code'].includes(stack[i].tag)) break;
      }
    }
    if (name === 'tr' && top().tag === 'table') {
      const lastChild = top().children[top().children.length - 1];
      stack.push(lastChild && lastChild.implicit ? lastChild : Object.assign(open('tbody', new Map()), { implicit: true }));
    }
    const node = open(name, parseAttrs(rest));
    if (!VOID_TAGS.has(name) && !whole.endsWith('/>')) stack.push(node);
  }
  const tail = html.slice(last);
  if (tail) top().texts.push(decode(tail));
  const finish = (nodes) =>
    nodes.map((n) => ({ tag: n.tag, attrs: n.attrs, text: collapse(n.texts.join(' ')), children: finish(n.children) }));
  return finish(root.children);
}

function skeleton(nodes) {
  return nodes.map((node) => `${node.tag}(${skeleton(node.children)})`).join(',');
}

function hasDetailIssues(expected, actual) {
  return expected.some((need, i) => {
    const have = actual[i];
    for (const [attr, value] of need.attrs) {
      if (!have.attrs.has(attr)) return true;
      if (!value) continue;
      const actualValue = have.attrs.get(attr);
      if (attr === 'class') {
        const present = new Set(actualValue.split(' '));
        if (value.split(' ').some((cls) => !present.has(cls))) return true;
      } else if (actualValue !== value) return true;
    }
    if (need.text && need.text !== have.text) return true;
    return hasDetailIssues(need.children, have.children);
  });
}

/**
 * Статус попытки по коду и ожидаемому HTML: success | partial | error | mismatch (как у клиента).
 * handwritten — клиент нашёл HTML, набранный руками (в заданиях Emmet это ошибка).
 */
function checkAttempt(source, exercise, { handwritten = false } = {}) {
  const code = String(source || '').trim();
  if (!code || !code.includes('<')) return STATUS.mismatch;
  if (exercise.mode === 'emmet' && handwritten) return STATUS.error;
  if (findMarkupErrors(code).length) return STATUS.error;
  const expected = parseTree(exercise.expectedHtml);
  const actual = parseTree(code);
  if (skeleton(expected) !== skeleton(actual)) return STATUS.mismatch;
  return hasDetailIssues(expected, actual) ? STATUS.partial : STATUS.success;
}

module.exports = { STATUS, checkAttempt, parseTree, findMarkupErrors };
