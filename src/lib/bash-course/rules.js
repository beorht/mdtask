// Правила кода задач курса «Bash: скрипты в Linux»: запрещённое (готовое, что решает задачу за студента) и
// обязательное (конструкции, ради которых задача). Код не выполняется здесь: проверяется текст без комментариев
// и без содержимого одинарных кавычек; синтаксис — разбором движком (public/js/bash-engine.js, parseCheck).
// Запись правила:
//   конструкции: «for» «while» «until» «case» «if» «read» «shift» «function» «printf» «seq» «expr» «let» «bc»
//     «export» «readonly» «unset» «arith» ($(( ))) «cmdsub» ($( )) «dbracket» ([[ ]]) «test» ([ ] или test)
//     «length» (${#…}) «trim» (${v#…}/${v%…}) «subst» (${v/…/…}) «default» (${v:-…} и родственные);
//   операторы: «&&» «||» «|» «>>» «>&2» «2>&1» — по тексту;
//   «def:имя» — функция с таким именем.

const B = require('../../../public/js/bash-engine.js');

const CONSTRUCT = {
  for: /\bfor\b/,
  while: /\bwhile\b/,
  until: /\buntil\b/,
  case: /\bcase\b/,
  if: /\bif\b/,
  elif: /\belif\b/,
  else: /\belse\b/,
  read: /\bread\b/,
  shift: /\bshift\b/,
  function: /\bfunction\b|\b[A-Za-z_][A-Za-z0-9_]*\s*\(\s*\)\s*\{/,
  printf: /\bprintf\b/,
  seq: /\bseq\b/,
  expr: /\bexpr\b/,
  let: /\blet\b/,
  bc: /\bbc\b/,
  export: /\bexport\b/,
  readonly: /\breadonly\b/,
  unset: /\bunset\b/,
  'echo-e': /\becho\s+-e\b/,
  arith: /\$\(\(/,
  cfor: /\bfor\s*\(\(/,
  cmdsub: /\$\(|`/,
  dbracket: /\[\[/,
  test: /\[\s|\btest\b/,
  length: /\$\{#/,
  trim: /\$\{[A-Za-z0-9_@*]+(?:\[[^\]]*\])?[#%]/,
  subst: /\$\{[A-Za-z0-9_@*]+(?:\[[^\]]*\])?\//,
  default: /\$\{[A-Za-z0-9_@*]+:?[-=?+]/,
  continue: /\bcontinue\b/,
  break: /\bbreak\b/,
};

const LABELS = {
  for: 'цикл for', while: 'цикл while', until: 'цикл until', case: 'конструкция case', if: 'условие if',
  elif: 'elif', else: 'else', read: 'команда read', shift: 'shift', function: 'своя функция',
  printf: 'printf', seq: 'seq', expr: 'expr', let: 'let', bc: 'bc', export: 'export', readonly: 'readonly',
  unset: 'unset', 'echo-e': 'echo -e', arith: 'арифметика $(( ))', cfor: 'цикл for ((…))',
  cmdsub: 'подстановка команды $( )', dbracket: 'проверка [[ … ]]', test: 'проверка [ … ] / test',
  length: 'длина ${#…}', trim: 'обрезка ${…#/%…}', subst: 'замена ${…/…/…}', default: 'подстановка по умолчанию ${…:-…}',
  continue: 'continue', break: 'break',
  '&&': 'оператор &&', '||': 'оператор ||', '|': 'конвейер |', '>>': 'добавление в файл >>',
  '>&2': 'вывод в поток ошибок >&2', '2>&1': 'слияние потоков 2>&1',
};

function ruleLabel(rule) {
  if (LABELS[rule]) return LABELS[rule];
  if (rule.startsWith('def:')) return `функция ${rule.slice(4)}()`;
  if (rule.startsWith('cmd:')) return `команда ${rule.slice(4)}`;
  return rule;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Код без комментариев и без содержимого одинарных кавычек (двойные кавычки оставляем — в них живут подстановки). */
function stripBash(code) {
  const src = String(code || '');
  let out = '';
  let i = 0;
  let q = null; // null | '"' | "'"
  while (i < src.length) {
    const c = src[i];
    if (q === "'") { if (c === "'") { out += "'"; q = null; } else out += ' '; i += 1; continue; }
    if (q === '"') { out += c; if (c === '"') q = null; i += 1; continue; }
    if (c === "'") { out += "'"; q = "'"; i += 1; continue; }
    if (c === '"') { out += '"'; q = '"'; i += 1; continue; }
    if (c === '#' && (i === 0 || /[\s;&|(]/.test(src[i - 1]))) { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    out += c; i += 1;
  }
  return out;
}

function declaredFunctions(text) {
  const names = new Set();
  for (const m of text.matchAll(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\b/g)) names.add(m[1]);
  for (const m of text.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{/g)) names.add(m[1]);
  return [...names];
}

function has(text, rule) {
  if (rule.startsWith('def:')) return declaredFunctions(text).includes(rule.slice(4));
  if (rule.startsWith('cmd:')) return new RegExp(`(^|[^\\w])${escapeRe(rule.slice(4))}(?![\\w])`).test(text);
  if (CONSTRUCT[rule]) return CONSTRUCT[rule].test(text);
  // прочее — как подстрока-оператор (&&, ||, |, >>, >&2, 2>&1, конкретный текст)
  return text.includes(rule);
}

/** Синтаксическая ошибка bash (текст) или null — разбором движка без выполнения. */
function syntaxError(code) {
  return B.parseCheck(code);
}

/** { syntax, found: [запрещённое], missing: [обязательное] }. */
function checkRules(code, { forbid = [], require = [] } = {}) {
  const syntax = syntaxError(code);
  if (syntax) return { syntax, found: [], missing: [] };
  const text = stripBash(code);
  return {
    syntax: null,
    found: forbid.filter((r) => has(text, r)),
    missing: require.filter((r) => !has(text, r)),
  };
}

module.exports = { checkRules, ruleLabel, stripBash, LABELS, CONSTRUCT };
