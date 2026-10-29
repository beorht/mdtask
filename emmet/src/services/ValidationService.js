/**
 * Проверка ответа ученика.
 * Сравнивается нормализованная структура DOM, а не исходный текст:
 * отступы, переносы строк и порядок атрибутов на результат не влияют.
 */

export const Status = {
  idle: 'idle',
  success: 'success',
  partial: 'partial',
  error: 'error',
  mismatch: 'mismatch',
};

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

const TAG_PATTERN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

/** Ищет незакрытые и лишние теги — браузерный парсер такие ошибки молча исправляет. */
export function findMarkupErrors(source) {
  const errors = [];
  const stack = [];

  for (const match of source.matchAll(TAG_PATTERN)) {
    const [whole, closing, rawName, rest] = match;
    if (!rawName) continue; // комментарий
    const name = rawName.toLowerCase();

    if (closing) {
      const openIndex = stack.lastIndexOf(name);
      if (openIndex === -1) {
        errors.push(`Лишний закрывающий тег </${name}> — для него нет открывающего.`);
        continue;
      }
      for (const unclosed of stack.splice(openIndex).slice(1).reverse()) {
        errors.push(`Тег <${unclosed}> не закрыт до </${name}>.`);
      }
      continue;
    }

    if (countQuotes(rest) % 2 !== 0) {
      errors.push(`В теге <${name}> не закрыта кавычка у атрибута.`);
    }
    if (!VOID_TAGS.has(name) && !whole.endsWith('/>')) stack.push(name);
  }

  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  if (/<\/?[a-zA-Z][^>]*$/.test(withoutComments)) {
    errors.push('Последний тег оборван — не хватает символа >.');
  }

  for (const unclosed of stack.reverse()) {
    errors.push(`Тег <${unclosed}> открыт, но не закрыт.`);
  }
  return errors;
}

function countQuotes(text) {
  // Кавычки внутри пары кавычек другого типа не считаем.
  const stripped = text.replace(/"[^"]*"|'[^']*'/g, '');
  return (stripped.match(/["']/g) ?? []).length;
}

/** Превращает HTML в дерево { tag, attrs, text, children } без пробельных узлов. */
export function parseTree(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return toNodes(template.content);
}

function toNodes(parent) {
  const nodes = [];
  for (const child of parent.childNodes) {
    if (child.nodeType !== 1) continue;
    const attrs = new Map();
    for (const { name, value } of child.attributes) {
      attrs.set(name, name === 'class' ? normalizeClasses(value) : value);
    }
    const text = [...child.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join(' ');
    nodes.push({
      tag: child.tagName.toLowerCase(),
      attrs,
      text: collapse(text),
      children: toNodes(child.content ?? child),
    });
  }
  return nodes;
}

const collapse = (text) => text.replace(/\s+/g, ' ').trim();
const normalizeClasses = (value) => value.split(/\s+/).filter(Boolean).sort().join(' ');

function skeleton(nodes) {
  return nodes.map((node) => `${node.tag}(${skeleton(node.children)})`).join(',');
}

const label = (node) => `<${node.tag}>`;
const ordinal = (index) => `${index + 1}-й`;

/** Первое структурное расхождение: не тот тег, не то количество, не та вложенность. */
/**
 * Сопоставление детей по тегам (наибольшая общая подпоследовательность): пары, пропущенные и лишние —
 * так видно, какой именно элемент пропущен, лишний или стоит не на своём месте (то же в src/lib/emmet/validate.js).
 */
function alignChildren(expected, actual) {
  const n = expected.length;
  const m = actual.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = expected[i].tag === actual[j].tag ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  const missing = [];
  const extra = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i].tag === actual[j].tag) { pairs.push([expected[i], actual[j]]); i += 1; j += 1; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { missing.push({ node: expected[i], index: i }); i += 1; }
    else { extra.push({ node: actual[j], index: j }); j += 1; }
  }
  for (; i < n; i += 1) missing.push({ node: expected[i], index: i });
  for (; j < m; j += 1) extra.push({ node: actual[j], index: j });
  return { pairs, missing, extra };
}

/** Отличия структуры — до трёх строк: что пропущено, что лишнее, что стоит вместо нужного (и где). */
function findStructureIssues(expected, actual, parent, out = []) {
  const where = parent ? `Внутри ${label(parent)}` : 'На верхнем уровне';
  const { pairs, missing, extra } = alignChildren(expected, actual);
  const sameTag = (list) => list.length > 0 && list.every((x) => x.node.tag === list[0].node.tag);
  const count = (list, tag) => list.filter((node) => node.tag === tag).length;
  if (missing.length === 1 && extra.length === 1 && missing[0].index === extra[0].index) {
    const position = expected.length > 1 ? `${ordinal(missing[0].index)} элемент` : 'Элемент';
    const scope = parent ? ` внутри ${label(parent)}` : '';
    out.push(`${position}${scope} должен быть <${missing[0].node.tag}>, а сейчас <${extra[0].node.tag}>.`);
  } else if (!extra.length && sameTag(missing) && count(expected, missing[0].node.tag) > 1) {
    const tag = missing[0].node.tag;
    out.push(`${where} должно быть ${count(expected, tag)} × <${tag}>, сейчас ${count(actual, tag)}.`);
  } else if (!missing.length && sameTag(extra) && count(expected, extra[0].node.tag) > 0) {
    const tag = extra[0].node.tag;
    out.push(`${where} должно быть ${count(expected, tag)} × <${tag}>, сейчас ${count(actual, tag)}.`);
  } else {
    for (const { node, index } of missing) out.push(`${where} не хватает элемента <${node.tag}> (${ordinal(index)} по счёту).`);
    for (const { node } of extra) out.push(`${where} лишний элемент <${node.tag}>.`);
  }
  for (const [need, have] of pairs) {
    if (out.length >= 3) break;
    findStructureIssues(need.children, have.children, have, out);
  }
  return out.slice(0, 3);
}

/**
 * Расхождения в атрибутах и тексте при уже совпавшей структуре.
 * Пустое ожидаемое значение означает «атрибут должен быть, значение — любое».
 */
function findDetailIssues(expected, actual, issues = []) {
  expected.forEach((need, i) => {
    const have = actual[i];
    const name = label(have);

    for (const [attr, value] of need.attrs) {
      if (!have.attrs.has(attr)) {
        issues.push(
          attr === 'class' ? `У ${name} нет класса ${value}.` : `У ${name} нет атрибута ${attr}.`,
        );
        continue;
      }
      if (!value) continue;
      const actualValue = have.attrs.get(attr);
      if (attr === 'class') {
        const present = new Set(actualValue.split(' '));
        const missing = value.split(' ').filter((cls) => !present.has(cls));
        if (missing.length) issues.push(`У ${name} не хватает класса ${missing.join(', ')}.`);
      } else if (actualValue !== value) {
        issues.push(`У ${name} атрибут ${attr} должен быть «${value}», а не «${actualValue}».`);
      }
    }

    if (need.text && need.text !== have.text) {
      issues.push(
        have.text
          ? `Текст в ${name} должен быть «${need.text}», а не «${have.text}».`
          : `В ${name} не хватает текста «${need.text}».`,
      );
    }

    findDetailIssues(need.children, have.children, issues);
  });
  return issues;
}

/**
 * Разметка документа по символам: «t» — текст между тегами,
 * «s» — синтаксис тега (скобки, имена, атрибуты), «v» — значение атрибута в кавычках.
 */
function classifyCharacters(source) {
  const kinds = new Array(source.length).fill('t');
  let inTag = false;
  let quote = null;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (!inTag) {
      if (char === '<' && /[a-zA-Z/!]/.test(source[i + 1] ?? '')) {
        inTag = true;
        kinds[i] = 's';
      }
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
        kinds[i] = 's';
      } else {
        kinds[i] = 'v';
      }
      continue;
    }
    kinds[i] = 's';
    if (char === '"' || char === "'") quote = char;
    else if (char === '>') inTag = false;
  }
  return kinds;
}

/**
 * Находит участки HTML, которые ученик написал сам, а не получил через Emmet.
 * handwritten — интервалы [from, to) набранного вручную текста.
 * Разрешено вручную: текст внутри элементов и значения атрибутов в кавычках.
 * Запрещено: угловые скобки, имена тегов, имена атрибутов, знаки = и кавычки.
 */
export function findHandwrittenMarkup(source, handwritten) {
  if (!handwritten.length) return [];
  const kinds = classifyCharacters(source);
  const offending = [];
  for (const [from, to] of handwritten) {
    for (let i = from; i < Math.min(to, source.length); i += 1) {
      const char = source[i];
      const isMarkup = char === '<' || char === '>' || (kinds[i] === 's' && !/\s/.test(char));
      if (!isMarkup) continue;
      const last = offending[offending.length - 1];
      if (last && last[1] === i) last[1] = i + 1;
      else offending.push([i, i + 1]);
    }
  }
  return offending;
}

/** Короткий фрагмент вокруг нарушения для сообщения ученику. */
function snippet(source, [from, to]) {
  const start = source.lastIndexOf('<', from) > source.lastIndexOf('>', from - 1)
    ? source.lastIndexOf('<', from)
    : from;
  const end = source.indexOf('>', to - 1);
  const text = source.slice(start, end === -1 ? to : end + 1).replace(/\s+/g, ' ').trim();
  return text.length > 32 ? `${text.slice(0, 31)}…` : text;
}

/**
 * Проверяет решение.
 * context.handwritten — интервалы текста, набранного вручную (из редактора).
 */
export function validate(source, exercise, { handwritten = [] } = {}) {
  const code = source.trim();

  if (!code) {
    return {
      status: Status.mismatch,
      title: 'Пока пусто',
      message: exercise.mode === 'html'
        ? 'Напишите HTML-код в редакторе.'
        : 'Наберите сокращение в редакторе и нажмите Tab.',
    };
  }

  if (!code.includes('<') && exercise.mode === 'html') {
    return {
      status: Status.mismatch,
      title: 'Пока нет ни одного тега',
      message: 'Напишите теги с угловыми скобками или наберите сокращение Emmet отдельной строкой и нажмите Tab.',
    };
  }

  if (!code.includes('<')) {
    return {
      status: Status.mismatch,
      title: 'Сокращение не развёрнуто',
      message: 'Поставьте курсор сразу после сокращения и нажмите Tab — Emmet превратит его в HTML.',
    };
  }

  if (exercise.mode === 'emmet') {
    const offending = findHandwrittenMarkup(source, handwritten);
    if (offending.length) {
      return {
        status: Status.error,
        title: 'HTML набран вручную',
        message: `«${snippet(source, offending[0])}» напечатано руками. Сотрите и получите разметку сокращением с Tab.`,
        extra: 'Руками можно вводить только текст и значения атрибутов.',
        handwritten: offending,
      };
    }
  }

  const markupErrors = findMarkupErrors(code);
  if (markupErrors.length) {
    return {
      status: Status.error,
      title: 'Ошибка в разметке',
      message: markupErrors[0],
      details: markupErrors.slice(0, 3),
    };
  }

  const expected = parseTree(exercise.expectedHtml);
  const actual = parseTree(code);

  if (skeleton(expected) !== skeleton(actual)) {
    const details = findStructureIssues(expected, actual, null);
    return {
      status: Status.mismatch,
      title: 'Структура пока другая',
      message: details[0] || 'Другое количество элементов.',
      details,
    };
  }

  const issues = findDetailIssues(expected, actual);
  if (issues.length) {
    return {
      status: Status.partial,
      title: 'Почти получилось',
      message: issues[0],
      details: issues.slice(0, 3),
      extra: issues.length > 3 ? `И ещё: ${issues.length - 3}.` : '',
    };
  }

  return {
    status: Status.success,
    title: 'Решение принято',
    message: 'Структура совпадает с условием задания.',
  };
}
