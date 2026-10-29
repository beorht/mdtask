// Правила кода задач курса JavaScript (src/lib/js-course): запрещённое (готовые методы, которые решают задачу за
// студента) и обязательное (конструкции, ради которых задача). Код не выполняется: проверяется текст без строк и
// комментариев, а синтаксис — разбором (new Function только компилирует, не запускает).
// Запись правила:
//   «.sort» — вызов метода;  «Math.max» — обращение к свойству;  «parseInt» — имя;  «?.» «**» — оператор;
//   «for» «while» «do» «if» «switch» «function» «=>» «class» «try» «throw» «async» «await» «new» «let» «const» «template»
//   (шаблонная строка) «spread» (...) «destructuring» — конструкции;
//   «def:имя» — функция с этим именем; «class:Имя» — класс; «recursion» — функция вызывает сама себя.

const CONSTRUCT = {
  for: /\bfor\s*\(/,
  while: /\bwhile\s*\(/,
  do: /\bdo\s*\{/,
  if: /\bif\s*\(/,
  switch: /\bswitch\s*\(/,
  function: /\bfunction\b/,
  '=>': /=>/,
  class: /\bclass\s+[A-Za-z_$]/,
  try: /\btry\s*\{/,
  throw: /\bthrow\b/,
  async: /\basync\b/,
  await: /\bawait\b/,
  new: /\bnew\s+[A-Za-z_$]/,
  let: /\blet\b/,
  const: /\bconst\b/,
  var: /\bvar\b/,
  spread: /\.\.\.[A-Za-z_$[{(]/,
  // const [a, b] = …, const { x } = …, function f({ x }), ({ x }) => …, [a, b] = [b, a]
  destructuring: /\b(?:const|let|var)\s*[[{]|\bfunction\b[^(]*\(\s*[[{]|\(\s*[[{][^)]*\)\s*=>|(?:^|[;{}\n])\s*\[[^\]]*\]\s*=[^=>]/,
  'for-of': /\bfor\s*\(\s*(?:const|let|var)?\s*[\w$[\]{},\s]+\s+of\b/,
  'for-in': /\bfor\s*\(\s*(?:const|let|var)?\s*[\w$]+\s+in\b/,
};

const LABELS = {
  for: 'цикл for', while: 'цикл while', do: 'цикл do…while', if: 'условие if', switch: 'switch', function: 'объявление function',
  '=>': 'стрелочная функция =>', class: 'свой класс (class)', try: 'обработка ошибок try/catch', throw: 'throw', async: 'async-функция',
  await: 'await', new: 'new', let: 'let', const: 'const', var: 'var', template: 'шаблонная строка `…${}…`', spread: 'оператор ...',
  destructuring: 'деструктуризация', recursion: 'рекурсивная функция', 'for-of': 'цикл for…of', 'for-in': 'цикл for…in',
};

function ruleLabel(rule) {
  if (LABELS[rule]) return LABELS[rule];
  if (rule.startsWith('def:')) return `функция ${rule.slice(4)}()`;
  if (rule.startsWith('class:')) return `класс ${rule.slice(6)}`;
  if (rule.startsWith('.')) return `${rule}()`;
  return rule;
}

/** Код без комментариев и содержимого строк (шаблонные строки — без текста, но с выражениями ${…}). */
function stripCode(code) {
  let out = '';
  let i = 0;
  const src = String(code || '');
  let template = false;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && n === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; out += ' '; continue; }
    if (c === '"' || c === "'") {
      out += c;
      i += 1;
      while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      out += c;
      i += 1;
      continue;
    }
    if (c === '`') {
      template = true;
      out += '`';
      i += 1;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') {
          let depth = 1;
          let j = i + 2;
          while (j < src.length && depth) { if (src[j] === '{') depth += 1; if (src[j] === '}') depth -= 1; j += 1; }
          out += ' ' + stripCode(src.slice(i + 2, j - 1)).text + ' ';
          i = j;
          continue;
        }
        i += 1;
      }
      out += '`';
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return { text: out, template };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Тело функции name (объявление function или const name = …): текст между фигурными скобками или ''. */
function functionBody(text, name) {
  const decl = new RegExp(`function\\s+${escapeRe(name)}\\s*\\(|(?:const|let|var)\\s+${escapeRe(name)}\\s*=\\s*(?:async\\s*)?(?:function\\b[^{]*|\\([^)]*\\)\\s*=>|[\\w$]+\\s*=>)`);
  const m = decl.exec(text);
  if (!m) return '';
  const open = text.indexOf('{', m.index + m[0].length - 1);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') { depth -= 1; if (depth === 0) return text.slice(open + 1, i); }
  }
  return text.slice(open + 1);
}

function declaredFunctions(text) {
  const names = new Set();
  for (const m of text.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)/g)) names.add(m[1]);
  return [...names];
}

function has(stripped, rule) {
  const { text, template } = stripped;
  if (rule === 'template') return template;
  if (rule === 'recursion') return declaredFunctions(text).some((name) => new RegExp(`(^|[^\\w$.])${escapeRe(name)}\\s*\\(`).test(functionBody(text, name)));
  if (rule.startsWith('def:')) return declaredFunctions(text).includes(rule.slice(4));
  if (rule.startsWith('class:')) return new RegExp(`\\bclass\\s+${escapeRe(rule.slice(6))}\\b`).test(text);
  if (CONSTRUCT[rule]) return CONSTRUCT[rule].test(text);
  if (rule.startsWith('.')) return new RegExp(`\\.\\s*${escapeRe(rule.slice(1))}\\s*\\(`).test(text);
  if (!/^[A-Za-z_$]/.test(rule)) return text.includes(rule); // оператор: «?.», «??», «**», «&&»
  return new RegExp(`(^|[^\\w$.])${escapeRe(rule)}(?![\\w$])`).test(text);
}

/** Синтаксическая ошибка (текст) или null. Код только компилируется, не выполняется. */
function syntaxError(code) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(`return (async () => {\n${code}\n})`);
    return null;
  } catch (e) {
    return `${e.name}: ${e.message}`;
  }
}

/** { syntax, found: [запрещённое], missing: [обязательное] }. */
function checkRules(code, { forbid = [], require = [] } = {}) {
  const syntax = syntaxError(code);
  if (syntax) return { syntax, found: [], missing: [] };
  const stripped = stripCode(code);
  return {
    syntax: null,
    found: forbid.filter((r) => has(stripped, r)),
    missing: require.filter((r) => !has(stripped, r)),
  };
}

module.exports = { checkRules, ruleLabel, stripCode, LABELS };
