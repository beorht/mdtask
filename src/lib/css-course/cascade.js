// Серверная перепроверка заданий предмета «Web-разработка: CSS» без браузера: разметка задания разбирается в дерево
// (../emmet/validate.js parseTree), CSS студента и эталон — в правила, и для каждого элемента (и ::before/::after)
// по правилам каскада вычисляются итоговые значения ВИДИМЫХ свойств — тех же, что сравнивает браузер
// (public/js/css-check.js): цвета, шрифт, рамки, скругления, тени, фон, прозрачность, трансформация, переходы,
// анимации, маркеры списков… Учитываются: селекторы (теги, классы, id, атрибуты, комбинаторы, :nth-child, :not,
// :is, :where, :hover/:focus/:active/:checked — как состояния задания), вес и порядок правил, !important,
// наследование, inherit/initial/unset, var(), сокращённые свойства, @media по ширине, стили браузера по умолчанию.
// Положение и размеры (раскладку) без браузера не посчитать — их проверяет только браузер студента.
const { parseTree } = require('../emmet/validate');

// ─── Цвета ───────────────────────────────────────────────────────────────────────────────────────────────
const NAMED = Object.fromEntries('aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkgrey:a9a9a9,darkkhaki:bdb76b,darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,darkred:8b0000,darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,darkslategrey:2f4f4f,darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,dimgray:696969,dimgrey:696969,dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,forestgreen:228b22,fuchsia:ff00ff,gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,goldenrod:daa520,gray:808080,green:008000,greenyellow:adff2f,grey:808080,honeydew:f0fff0,hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,khaki:f0e68c,lavender:e6e6fa,lavenderblush:fff0f5,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,lightcoral:f08080,lightcyan:e0ffff,lightgoldenrodyellow:fafad2,lightgray:d3d3d3,lightgreen:90ee90,lightgrey:d3d3d3,lightpink:ffb6c1,lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,lightslategray:778899,lightslategrey:778899,lightsteelblue:b0c4de,lightyellow:ffffe0,lime:00ff00,limegreen:32cd32,linen:faf0e6,magenta:ff00ff,maroon:800000,mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,mediumpurple:9370db,mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,mediumturquoise:48d1cc,mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,mistyrose:ffe4e1,moccasin:ffe4b5,navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:808000,olivedrab:6b8e23,orange:ffa500,orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,palegreen:98fb98,paleturquoise:afeeee,palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,peru:cd853f,pink:ffc0cb,plum:dda0dd,powderblue:b0e0e6,purple:800080,rebeccapurple:663399,red:ff0000,rosybrown:bc8f8f,royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,seagreen:2e8b57,seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,slategray:708090,slategrey:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32'
  .split(',').map((p) => p.split(':')));

const round = (n, k = 2) => Math.round(n * 10 ** k) / 10 ** k;
const clamp01 = (n) => Math.min(1, Math.max(0, n));

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Цвет → «rgba(r,g,b,a)» (целые каналы) или null, если это не цвет. currentcolor → null с пометкой снаружи. */
function parseColor(raw) {
  const v = raw.trim().toLowerCase();
  if (v === 'transparent') return 'rgba(0,0,0,0)';
  if (NAMED[v]) return parseColor('#' + NAMED[v]);
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6 && hex.length !== 8) return null;
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return `rgba(${n(0)},${n(2)},${n(4)},${hex.length === 8 ? round(n(6) / 255) : 1})`;
  }
  m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!m) return null;
  const parts = m[2].replace(/\s*\/\s*/, ' / ').split(/[\s,]+/).filter((p) => p && p !== '/');
  if (parts.length < 3) return null;
  const alphaRaw = parts[3];
  const alpha = alphaRaw === undefined ? 1 : alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
  let rgb;
  if (m[1].startsWith('rgb')) {
    rgb = parts.slice(0, 3).map((p) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
  } else {
    const h = parseFloat(parts[0]) * (parts[0].endsWith('turn') ? 360 : parts[0].endsWith('rad') ? 180 / Math.PI : 1);
    rgb = hslToRgb(h, clamp01(parseFloat(parts[1]) / 100), clamp01(parseFloat(parts[2]) / 100));
  }
  if (rgb.some((x) => !Number.isFinite(x)) || !Number.isFinite(alpha)) return null;
  const c = rgb.map((x) => Math.round(Math.min(255, Math.max(0, x))));
  return `rgba(${c.join(',')},${round(clamp01(alpha))})`;
}

// ─── Разбор CSS ──────────────────────────────────────────────────────────────────────────────────────────
function stripComments(css) {
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Разбить текст по разделителю на верхнем уровне (вне скобок и строк). */
function splitTop(text, sep) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (const ch of text) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseDeclarations(body) {
  const decls = [];
  for (const part of splitTop(body, ';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const prop = part.slice(0, i).trim();
    let value = part.slice(i + 1).trim();
    if (!prop || !value) continue;
    let important = false;
    const imp = /!\s*important\s*$/i.exec(value);
    if (imp) { important = true; value = value.slice(0, imp.index).trim(); }
    decls.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value, important });
  }
  return decls;
}

/** CSS → плоский список правил { selector, decls, media: [условия], order }. */
function parseCss(text) {
  const rules = [];
  const css = stripComments(text);
  function block(src, media) {
    let i = 0;
    while (i < src.length) {
      const open = indexTop(src, '{', i);
      if (open < 0) break;
      const prelude = src.slice(i, open).trim();
      const close = matchBrace(src, open);
      const body = src.slice(open + 1, close < 0 ? src.length : close);
      i = close < 0 ? src.length : close + 1;
      if (prelude.startsWith('@')) {
        const name = /^@([\w-]+)/.exec(prelude)[1].toLowerCase();
        if (name === 'media') block(body, [...media, prelude.slice(6).trim()]);
        else if (name === 'supports' || name === 'layer' || name === 'container') block(body, media);
        // @keyframes, @font-face, @page… — не правила для элементов
        continue;
      }
      // «@import …;» и прочее до первого правила
      const cleaned = prelude.replace(/^(@[^;]*;\s*)+/, '').trim();
      if (!cleaned) continue;
      rules.push({ selectors: splitTop(cleaned, ',').map((s) => s.trim()).filter(Boolean), decls: parseDeclarations(body), media, order: rules.length });
    }
  }
  block(css, []);
  return rules;
}

function indexTop(src, ch, from) {
  let quote = null;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === ch) return i;
  }
  return -1;
}

function matchBrace(src, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

// ─── @media ──────────────────────────────────────────────────────────────────────────────────────────────
function mediaMatches(query, env) {
  return splitTop(query, ',').some((q) => {
    let s = q.trim().toLowerCase();
    let negate = false;
    if (s.startsWith('not ')) { negate = true; s = s.slice(4); }
    s = s.replace(/^only\s+/, '');
    const parts = s.split(/\s+and\s+/);
    const ok = parts.every((p) => {
      const t = p.trim();
      if (t === 'screen' || t === 'all' || t === '') return true;
      if (t === 'print' || t === 'speech') return false;
      const m = /^\(\s*([\w-]+)\s*(?::\s*([^)]+))?\)$/.exec(t);
      if (!m) return false;
      const [, feature, rawVal] = m;
      const val = (rawVal || '').trim();
      const px = () => lengthPx(val, { fontSize: 16, rootFontSize: 16, vw: env.width, vh: env.height });
      switch (feature) {
        case 'min-width': return env.width >= px();
        case 'max-width': return env.width <= px();
        case 'width': return env.width === px();
        case 'min-height': return env.height >= px();
        case 'max-height': return env.height <= px();
        case 'orientation': return val === (env.width > env.height ? 'landscape' : 'portrait');
        case 'prefers-reduced-motion': return val === 'no-preference';
        case 'prefers-color-scheme': return val === 'light';
        case 'hover': return val === 'hover';
        case 'pointer': return val === 'fine';
        default: return false;
      }
    });
    return negate ? !ok : ok;
  });
}

// ─── Селекторы ───────────────────────────────────────────────────────────────────────────────────────────
// Сложный селектор → [{ compound, combinator }] справа налево; compound — { tag, ids, classes, attrs, pseudos }.
const PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-letter', 'first-line', 'placeholder', 'selection', 'marker', 'backdrop', 'file-selector-button']);
const STATE_PSEUDOS = new Set(['hover', 'focus', 'active', 'focus-within', 'focus-visible']);

function parseSelector(sel) {
  const parts = [];
  let i = 0;
  let pending = ' ';
  let pseudoElement = null;
  const src = sel.trim();
  while (i < src.length) {
    // комбинатор
    let ws = false;
    while (i < src.length && /\s/.test(src[i])) { i += 1; ws = true; }
    if (i >= src.length) break;
    if ('>+~'.includes(src[i])) {
      pending = src[i];
      i += 1;
      while (i < src.length && /\s/.test(src[i])) i += 1;
    } else if (ws && parts.length) pending = ' ';
    const comp = { tag: null, ids: [], classes: [], attrs: [], pseudos: [] };
    let any = false;
    while (i < src.length && !/[\s>+~]/.test(src[i])) {
      const c = src[i];
      if (c === '*') { i += 1; any = true; continue; }
      if (c === '#' || c === '.') {
        const m = /^[\w-]+/.exec(src.slice(i + 1));
        if (!m) return null;
        (c === '#' ? comp.ids : comp.classes).push(m[0]);
        i += 1 + m[0].length;
        any = true;
        continue;
      }
      if (c === '[') {
        const end = indexTop(src, ']', i);
        if (end < 0) return null;
        const body = src.slice(i + 1, end);
        const m = /^\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))\s*([is])?)?\s*$/.exec(body);
        if (!m) return null;
        comp.attrs.push({ name: m[1].toLowerCase(), op: m[2] || null, value: m[3] ?? m[4] ?? m[5] ?? '', flag: m[6] || '' });
        i = end + 1;
        any = true;
        continue;
      }
      if (c === ':') {
        const double = src[i + 1] === ':';
        const m = /^([\w-]+)/.exec(src.slice(i + (double ? 2 : 1)));
        if (!m) return null;
        const name = m[1].toLowerCase();
        let j = i + (double ? 2 : 1) + m[0].length;
        let arg = null;
        if (src[j] === '(') {
          let depth = 0;
          let k = j;
          for (; k < src.length; k += 1) {
            if (src[k] === '(') depth += 1;
            if (src[k] === ')') { depth -= 1; if (depth === 0) break; }
          }
          arg = src.slice(j + 1, k);
          j = k + 1;
        }
        if (double || PSEUDO_ELEMENTS.has(name)) pseudoElement = name;
        else comp.pseudos.push({ name, arg, list: ['not', 'is', 'where', 'matches', 'has'].includes(name) && arg !== null ? splitTop(arg, ',').map((s) => parseSelector(s)) : null });
        i = j;
        any = true;
        continue;
      }
      const m = /^[\w-]+/.exec(src.slice(i));
      if (!m) return null;
      comp.tag = m[0].toLowerCase();
      i += m[0].length;
      any = true;
    }
    if (!any) return null;
    parts.push({ compound: comp, combinator: parts.length ? pending : null });
    pending = ' ';
  }
  if (!parts.length) return null;
  return { parts, pseudoElement, specificity: specificityOf(parts, pseudoElement) };
}

function specificityOf(parts, pseudoElement) {
  const s = [0, 0, 0];
  for (const { compound: c } of parts) {
    s[0] += c.ids.length;
    s[1] += c.classes.length + c.attrs.length;
    if (c.tag) s[2] += 1;
    for (const p of c.pseudos) {
      if (p.name === 'where') continue;
      if (p.list) {
        const best = p.list.filter(Boolean).map((x) => x.specificity).sort(cmpSpec).pop() || [0, 0, 0];
        s[0] += best[0]; s[1] += best[1]; s[2] += best[2];
      } else s[1] += 1;
    }
  }
  if (pseudoElement) s[2] += 1;
  return s;
}

const cmpSpec = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function nthMatches(arg, pos) {
  const a0 = String(arg || '').trim().toLowerCase().replace(/\s+of\s+.*$/, '');
  if (a0 === 'odd') return pos % 2 === 1;
  if (a0 === 'even') return pos % 2 === 0;
  const m = /^([+-]?\d*)n\s*(?:([+-])\s*(\d+))?$/.exec(a0.replace(/\s+/g, ''));
  if (!m) return Number(a0) === pos;
  const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1]);
  const b = m[3] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0;
  if (a === 0) return pos === b;
  return (pos - b) / a >= 0 && (pos - b) % a === 0;
}

function attrMatches(node, { name, op, value, flag }) {
  if (!node.attrs.has(name)) return false;
  let actual = name === 'class' ? node.classList.join(' ') : node.attrs.get(name);
  let v = value;
  if (flag === 'i') { actual = actual.toLowerCase(); v = v.toLowerCase(); }
  switch (op) {
    case null: return true;
    case '=': return actual === v;
    case '~=': return actual.split(/\s+/).includes(v);
    case '|=': return actual === v || actual.startsWith(v + '-');
    case '^=': return v !== '' && actual.startsWith(v);
    case '$=': return v !== '' && actual.endsWith(v);
    case '*=': return v !== '' && actual.includes(v);
    default: return false;
  }
}

function compoundMatches(node, c, env) {
  if (c.tag && c.tag !== node.tag) return false;
  if (c.ids.some((id) => node.attrs.get('id') !== id)) return false;
  if (c.classes.some((cl) => !node.classList.includes(cl))) return false;
  if (c.attrs.some((a) => !attrMatches(node, a))) return false;
  for (const p of c.pseudos) if (!pseudoMatches(node, p, env)) return false;
  return true;
}

function pseudoMatches(node, p, env) {
  const sibs = node.parent ? node.parent.children : [node];
  const idx = sibs.indexOf(node);
  const sameType = sibs.filter((s) => s.tag === node.tag);
  const tIdx = sameType.indexOf(node);
  switch (p.name) {
    case 'first-child': return idx === 0;
    case 'last-child': return idx === sibs.length - 1;
    case 'only-child': return sibs.length === 1;
    case 'nth-child': return nthMatches(p.arg, idx + 1);
    case 'nth-last-child': return nthMatches(p.arg, sibs.length - idx);
    case 'first-of-type': return tIdx === 0;
    case 'last-of-type': return tIdx === sameType.length - 1;
    case 'only-of-type': return sameType.length === 1;
    case 'nth-of-type': return nthMatches(p.arg, tIdx + 1);
    case 'nth-last-of-type': return nthMatches(p.arg, sameType.length - tIdx);
    case 'root': return node.tag === 'html';
    case 'empty': return node.children.length === 0 && !node.text;
    case 'not': return p.list.every((s) => s && !matchesSelector(node, s, env));
    case 'is': case 'where': case 'matches': return p.list.some((s) => s && matchesSelector(node, s, env));
    case 'has': return false;
    case 'link': case 'any-link': return node.tag === 'a' && node.attrs.has('href');
    case 'visited': case 'target': return false;
    case 'checked': return env.checked.has(node);
    case 'disabled': return node.attrs.has('disabled');
    case 'enabled': return ['input', 'button', 'select', 'textarea'].includes(node.tag) && !node.attrs.has('disabled');
    case 'required': return node.attrs.has('required');
    case 'optional': return ['input', 'select', 'textarea'].includes(node.tag) && !node.attrs.has('required');
    case 'placeholder-shown': return node.attrs.has('placeholder') && !node.attrs.get('value');
    default:
      // Состояния задания — как в проверке браузера (public/js/css-check.js): включены только у выбранных элементов.
      if (STATE_PSEUDOS.has(p.name)) return env.states.some((s) => s.state === p.name && s.nodes.includes(node));
      return false;
  }
}

function matchesSelector(node, sel, env) {
  const parts = sel.parts;
  function matchFrom(i, n) {
    if (!compoundMatches(n, parts[i].compound, env)) return false;
    if (i === 0) return true;
    const comb = parts[i].combinator;
    if (comb === '>') return n.parent && n.parent.tag !== '#doc' ? matchFrom(i - 1, n.parent) : false;
    if (comb === ' ') { for (let p = n.parent; p && p.tag !== '#doc'; p = p.parent) if (matchFrom(i - 1, p)) return true; return false; }
    const sibs = n.parent ? n.parent.children : [];
    const k = sibs.indexOf(n);
    if (comb === '+') return k > 0 && matchFrom(i - 1, sibs[k - 1]);
    if (comb === '~') { for (let j = k - 1; j >= 0; j -= 1) if (matchFrom(i - 1, sibs[j])) return true; return false; }
    return false;
  }
  return matchFrom(parts.length - 1, node);
}

// ─── Документ ────────────────────────────────────────────────────────────────────────────────────────────
const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/gi;

function buildDocument(html) {
  const styles = [];
  const body = String(html || '').replace(STYLE_BLOCK, (all, css) => { styles.push(css); return ''; });
  const docNode = { tag: '#doc', attrs: new Map(), classList: [], children: [], parent: null, text: '' };
  const htmlNode = { tag: 'html', attrs: new Map(), classList: [], children: [], parent: docNode, text: '' };
  const bodyNode = { tag: 'body', attrs: new Map(), classList: [], children: [], parent: htmlNode, text: '' };
  docNode.children = [htmlNode];
  htmlNode.children = [{ tag: 'head', attrs: new Map(), classList: [], children: [], parent: htmlNode, text: '' }, bodyNode];
  const wrap = (n, parent) => {
    const node = { tag: n.tag, attrs: n.attrs, classList: (n.attrs.get('class') || '').split(/\s+/).filter(Boolean), text: n.text, parent, children: [] };
    node.children = n.children.map((c) => wrap(c, node));
    return node;
  };
  bodyNode.children = parseTree(body).map((n) => wrap(n, bodyNode));
  const all = [];
  (function walk(n) { all.push(n); n.children.forEach(walk); })(htmlNode);
  return { root: htmlNode, body: bodyNode, elements: all.filter((n) => n.tag !== 'head'), styles };
}

// ─── Стили браузера по умолчанию (то, что важно для сравниваемых свойств) ──────────────────────────────
const UA_CSS = `
html { color: #222222; font-family: "Open Sans", sans-serif; font-size: 16px; }
head, script, style, template, [hidden] { display: none; }
h1 { font-size: 2em; font-weight: bold; } h2 { font-size: 1.5em; font-weight: bold; } h3 { font-size: 1.17em; font-weight: bold; }
h4 { font-size: 1em; font-weight: bold; } h5 { font-size: 0.83em; font-weight: bold; } h6 { font-size: 0.67em; font-weight: bold; }
article h1, aside h1, nav h1, section h1 { font-size: 1.5em; }
b, strong, th, dt { font-weight: bold; } small { font-size: smaller; } sub, sup { font-size: smaller; }
i, em, cite, var, dfn, address { font-style: italic; }
code, kbd, samp, pre, tt { font-family: monospace; font-size: 0.8125em; }
a:any-link { color: rgb(0, 0, 238); text-decoration: underline; cursor: pointer; }
u, ins { text-decoration: underline; } s, del, strike { text-decoration: line-through; }
mark { background-color: yellow; color: black; }
th { text-align: center; } td, th { vertical-align: inherit; } tr, tbody, thead, tfoot { vertical-align: middle; }
table { border-collapse: separate; } hr { border-style: inset; border-width: 1px; color: gray; }
ul, menu { list-style-type: disc; } ol { list-style-type: decimal; } ul ul, ol ul { list-style-type: circle; } ul ul ul, ol ul ul { list-style-type: square; }
li { display: list-item; } img { overflow: clip; }
button, input, select, textarea { font-size: 13.3333px; font-weight: 400; font-family: system-ui; color: black; letter-spacing: normal; text-transform: none; text-indent: 0; text-shadow: none; text-align: start; line-height: normal; cursor: default; }
input, textarea, select { background-color: white; border: 2px inset rgb(118, 118, 118); }
button { background-color: rgb(239, 239, 239); border: 2px outset rgb(118, 118, 118); text-align: center; }
input[type="checkbox"], input[type="radio"] { border: initial; background-color: initial; }
textarea { font-family: monospace; overflow-x: auto; overflow-y: auto; white-space: pre-wrap; }
blockquote, figure { } summary { cursor: pointer; } label { cursor: default; }
pre { white-space: pre; } nobr { white-space: nowrap; }
html, body, div, p, h1, h2, h3, h4, h5, h6, ul, ol, dl, dd, dt, blockquote, figure, figcaption, pre, header, footer, nav, main, section, article, aside,
address, form, fieldset, legend, details, summary, hr, menu, hgroup, search { display: block; }
li { display: list-item; } table { display: table; } tr { display: table-row; } td, th { display: table-cell; } thead { display: table-header-group; }
tbody { display: table-row-group; } tfoot { display: table-footer-group; } caption { display: table-caption; } col { display: table-column; }
button, input, select, textarea, img, video, audio, iframe { display: inline-block; } summary { display: list-item; }
body { margin: 8px; } p, dl, pre, menu { margin-top: 1em; margin-bottom: 1em; } ul, ol { margin-top: 1em; margin-bottom: 1em; padding-left: 40px; }
ul ul, ul ol, ol ul, ol ol { margin-top: 0; margin-bottom: 0; } dd { margin-left: 40px; }
blockquote, figure { margin: 1em 40px; } h1 { margin: 0.67em 0; } h2 { margin: 0.83em 0; } h3 { margin: 1em 0; } h4 { margin: 1.33em 0; }
h5 { margin: 1.67em 0; } h6 { margin: 2.33em 0; } article h1, aside h1, nav h1, section h1 { margin: 0.83em 0; }
hr { margin: 0.5em auto; } fieldset { margin: 0 2px; padding: 0.35em 0.75em 0.625em; } button { padding: 1px 6px; } input { padding: 1px 2px; }
textarea { padding: 2px; } td, th { padding: 1px; } select { padding: 0; }
input, button, select { overflow-x: clip; overflow-y: clip; }
fieldset { border: 2px groove rgb(192, 192, 192); } legend { }
`;

// ─── Свойства: наследуемость и начальные значения ────────────────────────────────────────────────────────
const INHERITED = new Set(['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align', 'text-transform',
  'letter-spacing', 'word-spacing', 'text-indent', 'text-shadow', 'white-space', 'list-style-type', 'list-style-position', 'visibility',
  'cursor', 'border-collapse']);
const INITIAL = {
  color: 'canvastext', 'background-color': 'rgba(0,0,0,0)', 'background-image': 'none', 'background-size': 'auto', 'background-position': '0% 0%',
  'background-repeat': 'repeat', 'font-family': 'serif', 'font-size': '16px', 'font-weight': '400', 'font-style': 'normal', 'line-height': 'normal',
  'text-align': 'start', 'text-decoration-line': 'none', 'text-decoration-style': 'solid', 'text-decoration-color': 'currentcolor', 'text-transform': 'none',
  'letter-spacing': 'normal', 'word-spacing': '0px', 'text-indent': '0px', 'text-shadow': 'none', 'white-space': 'normal', 'vertical-align': 'baseline',
  'list-style-type': 'disc', 'list-style-position': 'outside', 'border-collapse': 'separate', 'box-shadow': 'none', 'outline-style': 'none',
  'outline-width': 'medium', 'outline-color': 'currentcolor', 'outline-offset': '0px', opacity: '1', visibility: 'visible', 'overflow-x': 'visible',
  'overflow-y': 'visible', cursor: 'auto', transform: 'none', 'transition-duration': '0s', 'transition-timing-function': 'ease', 'transition-delay': '0s',
  'animation-duration': '0s', 'animation-timing-function': 'ease', 'animation-delay': '0s', 'animation-iteration-count': '1', 'animation-direction': 'normal',
  'animation-fill-mode': 'none', 'object-fit': 'fill', 'text-overflow': 'clip', display: 'inline', content: 'normal', width: 'auto', height: 'auto',
  position: 'static', top: 'auto', left: 'auto', right: 'auto', bottom: 'auto', float: 'none', 'margin-right': '0px',
};
for (const side of ['top', 'right', 'bottom', 'left']) {
  INITIAL[`border-${side}-width`] = 'medium';
  INITIAL[`border-${side}-style`] = 'none';
  INITIAL[`border-${side}-color`] = 'currentcolor';
}
for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) INITIAL[`border-${corner}-radius`] = '0px';

// Свойства раскладки: без браузера не понять, совпадёт ли результат (одну раскладку дают разные свойства), поэтому
// расхождение с эталоном здесь — только сигнал преподавателю, а не отказ.
const LAYOUT = ['display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'box-sizing', 'width', 'height', 'min-width', 'max-width',
  'min-height', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom',
  'padding-left', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'align-self', 'justify-items', 'justify-self',
  'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas',
  'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'z-index'];
Object.assign(INITIAL, {
  float: 'none', 'box-sizing': 'content-box', 'min-width': 'auto', 'max-width': 'none', 'min-height': 'auto', 'max-height': 'none',
  'flex-direction': 'row', 'flex-wrap': 'nowrap', 'justify-content': 'normal', 'align-items': 'normal', 'align-content': 'normal', 'align-self': 'auto',
  'justify-items': 'normal', 'justify-self': 'auto', 'flex-grow': '0', 'flex-shrink': '1', 'flex-basis': 'auto', order: '0', 'row-gap': 'normal',
  'column-gap': 'normal', 'grid-template-columns': 'none', 'grid-template-rows': 'none', 'grid-template-areas': 'none', 'grid-auto-rows': 'auto',
  'grid-auto-columns': 'auto', 'grid-auto-flow': 'row', 'grid-column-start': 'auto', 'grid-column-end': 'auto', 'grid-row-start': 'auto',
  'grid-row-end': 'auto', 'z-index': 'auto',
});
for (const sd of ['top', 'right', 'bottom', 'left']) { INITIAL[`margin-${sd}`] = '0px'; INITIAL[`padding-${sd}`] = '0px'; }

// Сравниваемые на сервере свойства — видимые и не зависящие от раскладки (как в public/js/css-check.js PROPS, без
// z-index, transform-origin и свойств, которые зависят от размеров).
const COMPARED = ['color', 'background-color', 'background-image', 'background-size', 'background-repeat', 'font-family', 'font-size', 'font-weight',
  'font-style', 'line-height', 'text-align', 'text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-transform', 'letter-spacing',
  'word-spacing', 'text-shadow', 'white-space', 'list-style-type', 'list-style-position', 'border-top-width', 'border-right-width', 'border-bottom-width',
  'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-top-color', 'border-right-color',
  'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'border-collapse', 'box-shadow', 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'opacity', 'visibility', 'transform',
  'transition-duration', 'transition-timing-function', 'transition-delay', 'animation-duration', 'animation-timing-function', 'animation-delay',
  'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'object-fit', 'text-overflow'];
const PSEUDO_COMPARED = ['content', 'color', 'background-color', 'font-size', 'font-weight', 'transform', 'opacity'];
const LETTER_COMPARED = ['font-size', 'font-weight', 'color', 'float', 'line-height', 'margin-right', 'background-color', 'text-transform'];
const LABELS = {
  color: 'цвет текста', 'background-color': 'цвет фона', 'background-image': 'фоновое изображение или градиент', 'background-size': 'размер фона',
  'background-repeat': 'повтор фона', 'font-family': 'шрифт', 'font-size': 'размер шрифта', 'font-weight': 'насыщенность шрифта', 'font-style': 'начертание (курсив)',
  'line-height': 'высота строки', 'text-align': 'выравнивание текста', 'text-decoration-line': 'подчёркивание / зачёркивание', 'text-decoration-style': 'стиль линии текста',
  'text-decoration-color': 'цвет линии текста', 'text-transform': 'регистр букв', 'letter-spacing': 'расстояние между буквами', 'word-spacing': 'расстояние между словами',
  'text-shadow': 'тень текста', 'white-space': 'перенос строк', 'list-style-type': 'маркер списка', 'list-style-position': 'положение маркера',
  'border-collapse': 'слияние рамок таблицы', 'box-shadow': 'тень блока', 'outline-style': 'стиль контура', 'outline-width': 'толщина контура', 'outline-color': 'цвет контура',
  'outline-offset': 'отступ контура', opacity: 'прозрачность', visibility: 'видимость', transform: 'трансформация', 'transition-duration': 'плавный переход: длительность',
  'transition-timing-function': 'плавный переход: характер движения', 'transition-delay': 'плавный переход: задержка', 'animation-duration': 'анимация: длительность',
  'animation-timing-function': 'анимация: характер движения', 'animation-delay': 'анимация: задержка', 'animation-iteration-count': 'анимация: число повторов',
  'animation-direction': 'анимация: направление', 'animation-fill-mode': 'анимация: состояние до и после', 'object-fit': 'вписывание картинки', 'text-overflow': 'обрезка текста многоточием',
  content: 'содержимое ::before/::after',
};
const label = (p) => LABELS[p] || (/^border-.*-width$/.test(p) ? 'толщина рамки' : /^border-.*-style$/.test(p) ? 'стиль рамки' : /^border-.*-color$/.test(p) ? 'цвет рамки' : /radius/.test(p) ? 'скругление углов' : p);

// ─── Сокращённые свойства → полные ──────────────────────────────────────────────────────────────────────
const SIDES = ['top', 'right', 'bottom', 'left'];
const BORDER_STYLES = new Set(['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset']);
const WIDE = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const tokens = (v) => splitTop(v.trim(), ' ').map((t) => t.trim()).filter(Boolean);
const isColorToken = (t) => parseColor(t) !== null || t.toLowerCase() === 'currentcolor';
const isLength = (t) => /^-?[\d.]+(px|em|rem|%|vw|vh|vmin|vmax|pt|cm|mm|in|ch|ex)?$/i.test(t) || /^(calc|clamp|min|max)\(/i.test(t) || ['thin', 'medium', 'thick'].includes(t);

function fourSides(v) {
  const t = tokens(v);
  const [a, b = a, c = a, d = b] = t;
  return [a, b, c, d];
}

function expand(prop, value) {
  const v = value.trim();
  const all = (props) => props.map((p) => [p, v]);
  const low = v.toLowerCase();
  switch (prop) {
    case 'border': case 'border-top': case 'border-right': case 'border-bottom': case 'border-left': {
      const sides = prop === 'border' ? SIDES : [prop.slice(7)];
      if (WIDE.has(low)) return sides.flatMap((s) => [[`border-${s}-width`, v], [`border-${s}-style`, v], [`border-${s}-color`, v]]);
      let width = 'medium'; let style = 'none'; let color = 'currentcolor';
      for (const t of tokens(v)) {
        if (BORDER_STYLES.has(t.toLowerCase())) style = t.toLowerCase();
        else if (isLength(t)) width = t;
        else color = t;
      }
      return sides.flatMap((s) => [[`border-${s}-width`, width], [`border-${s}-style`, style], [`border-${s}-color`, color]]);
    }
    case 'border-width': case 'border-style': case 'border-color': {
      const kind = prop.slice(7);
      if (WIDE.has(low)) return SIDES.map((s) => [`border-${s}-${kind}`, v]);
      return fourSides(v).map((x, i) => [`border-${SIDES[i]}-${kind}`, x]);
    }
    case 'border-radius': {
      const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
      if (WIDE.has(low)) return corners.map((c) => [`border-${c}-radius`, v]);
      const [h, vert] = v.split('/').map((s) => s.trim());
      const hs = fourSides(h);
      const vs = vert ? fourSides(vert) : null;
      const order = [0, 1, 2, 3];
      return order.map((i) => [`border-${corners[i]}-radius`, vs ? `${hs[i]} ${vs[i]}` : hs[i]]);
    }
    case 'background': {
      if (WIDE.has(low)) return all(['background-color', 'background-image', 'background-size', 'background-repeat', 'background-position']);
      const layers = splitTop(v, ',');
      const lastLayer = layers[layers.length - 1];
      let color = 'rgba(0,0,0,0)';
      const images = [];
      let repeat = 'repeat';
      let size = 'auto';
      let position = '0% 0%';
      layers.forEach((layer, li) => {
        let img = 'none';
        const [beforeSlash, afterSlash] = splitTop(layer, '/');
        const posTokens = [];
        for (const t of tokens(beforeSlash)) {
          const tl = t.toLowerCase();
          if (/^(url|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\(/i.test(t)) img = t;
          else if (['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'].includes(tl)) { if (li === layers.length - 1) repeat = tl; }
          else if (li === layers.length - 1 && layer === lastLayer && isColorToken(t)) color = t;
          else if (['scroll', 'fixed', 'local', 'border-box', 'padding-box', 'content-box', 'text'].includes(tl)) { /* не сравнивается */ }
          else posTokens.push(t);
        }
        if (afterSlash && li === layers.length - 1) {
          const st = tokens(afterSlash);
          const sizeTokens = [];
          for (const t of st) {
            if (isColorToken(t) && !isLength(t) && !['cover', 'contain', 'auto'].includes(t.toLowerCase())) color = t;
            else if (['repeat', 'no-repeat', 'repeat-x', 'repeat-y'].includes(t.toLowerCase())) repeat = t.toLowerCase();
            else sizeTokens.push(t);
          }
          size = sizeTokens.join(' ') || 'auto';
        }
        if (li === layers.length - 1 && posTokens.length) position = posTokens.join(' ');
        images.push(img);
      });
      return [['background-color', color], ['background-image', images.every((x) => x === 'none') ? 'none' : images.join(', ')], ['background-repeat', repeat], ['background-size', size], ['background-position', position]];
    }
    case 'font': {
      if (WIDE.has(low)) return all(['font-style', 'font-weight', 'font-size', 'line-height', 'font-family']);
      if (['caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar'].includes(low)) return [];
      // [style] [variant] [weight] size[/line-height] family
      const m = /^(.*?)((?:-?[\d.]+(?:px|em|rem|%|pt|vw|vh)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger|(?:calc|clamp|min|max)\([^)]*\))(?:\s*\/\s*([^\s]+))?)\s+(.+)$/i.exec(v);
      if (!m) return [];
      let style = 'normal'; let weight = 'normal';
      for (const t of tokens(m[1])) {
        const tl = t.toLowerCase();
        if (tl === 'italic' || tl === 'oblique') style = tl;
        else if (/^(bold|bolder|lighter|\d{3})$/.test(tl)) weight = tl;
      }
      const sizePart = m[2].split('/')[0].trim();
      return [['font-style', style], ['font-weight', weight], ['font-size', sizePart], ['line-height', m[3] || 'normal'], ['font-family', m[4]]];
    }
    case 'text-decoration': {
      if (WIDE.has(low)) return all(['text-decoration-line', 'text-decoration-style', 'text-decoration-color']);
      const lines = []; let style = 'solid'; let color = 'currentcolor';
      for (const t of tokens(v)) {
        const tl = t.toLowerCase();
        if (['underline', 'overline', 'line-through', 'blink'].includes(tl)) lines.push(tl);
        else if (tl === 'none') { /* none */ }
        else if (['solid', 'double', 'dotted', 'dashed', 'wavy'].includes(tl)) style = tl;
        else if (isColorToken(t)) color = t;
      }
      return [['text-decoration-line', lines.join(' ') || 'none'], ['text-decoration-style', style], ['text-decoration-color', color]];
    }
    case 'list-style': {
      if (WIDE.has(low)) return all(['list-style-type', 'list-style-position']);
      let type = 'disc'; let position = 'outside';
      for (const t of tokens(v)) {
        const tl = t.toLowerCase();
        if (tl === 'inside' || tl === 'outside') position = tl;
        else if (!/^url\(/.test(tl)) type = tl;
      }
      return [['list-style-type', type], ['list-style-position', position]];
    }
    case 'outline': {
      if (WIDE.has(low)) return all(['outline-style', 'outline-width', 'outline-color']);
      let width = 'medium'; let style = 'none'; let color = 'currentcolor';
      for (const t of tokens(v)) {
        const tl = t.toLowerCase();
        if (BORDER_STYLES.has(tl) || tl === 'auto') style = tl;
        else if (isLength(t)) width = t;
        else color = t;
      }
      return [['outline-style', style], ['outline-width', width], ['outline-color', color]];
    }
    case 'overflow': {
      const [x, y = x] = tokens(v);
      return [['overflow-x', x], ['overflow-y', y]];
    }
    case 'transition': {
      if (WIDE.has(low)) return all(['transition-duration', 'transition-timing-function', 'transition-delay']);
      const durs = []; const funcs = []; const delays = [];
      for (const item of splitTop(v, ',')) {
        const times = [];
        let fn = 'ease';
        for (const t of tokens(item)) {
          if (/^-?[\d.]+m?s$/i.test(t)) times.push(t);
          else if (/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/i.test(t) || /^(cubic-bezier|steps|linear)\(/i.test(t)) fn = t;
        }
        durs.push(times[0] || '0s'); delays.push(times[1] || '0s'); funcs.push(fn);
      }
      return [['transition-duration', durs.join(', ')], ['transition-timing-function', funcs.join(', ')], ['transition-delay', delays.join(', ')]];
    }
    case 'animation': {
      if (WIDE.has(low)) return all(['animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode']);
      const cols = { d: [], f: [], de: [], i: [], di: [], fi: [] };
      for (const item of splitTop(v, ',')) {
        const times = [];
        let fn = 'ease'; let count = '1'; let dir = 'normal'; let fill = 'none';
        for (const t of tokens(item)) {
          const tl = t.toLowerCase();
          if (/^-?[\d.]+m?s$/.test(tl)) times.push(tl);
          else if (/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/.test(tl) || /^(cubic-bezier|steps|linear)\(/.test(tl)) fn = tl;
          else if (tl === 'infinite' || /^[\d.]+$/.test(tl)) count = tl;
          else if (['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(tl)) dir = tl;
          else if (['none', 'forwards', 'backwards', 'both'].includes(tl)) fill = tl;
        }
        cols.d.push(times[0] || '0s'); cols.de.push(times[1] || '0s'); cols.f.push(fn); cols.i.push(count); cols.di.push(dir); cols.fi.push(fill);
      }
      return [['animation-duration', cols.d.join(', ')], ['animation-timing-function', cols.f.join(', ')], ['animation-delay', cols.de.join(', ')],
        ['animation-iteration-count', cols.i.join(', ')], ['animation-direction', cols.di.join(', ')], ['animation-fill-mode', cols.fi.join(', ')]];
    }
    case 'inset': {
      const [t, r, b, l] = fourSides(v);
      return [['top', t], ['right', r], ['bottom', b], ['left', l]];
    }
    case 'margin': case 'padding': {
      if (WIDE.has(low)) return SIDES.map((sd) => [`${prop}-${sd}`, v]);
      return fourSides(v).map((x, i) => [`${prop}-${SIDES[i]}`, x]);
    }
    case 'flex': {
      if (low === 'none') return [['flex-grow', '0'], ['flex-shrink', '0'], ['flex-basis', 'auto']];
      if (low === 'auto') return [['flex-grow', '1'], ['flex-shrink', '1'], ['flex-basis', 'auto']];
      if (WIDE.has(low)) return all(['flex-grow', 'flex-shrink', 'flex-basis']);
      const t = tokens(v);
      const nums = t.filter((x) => /^[\d.]+$/.test(x));
      const basis = t.find((x) => !/^[\d.]+$/.test(x));
      return [['flex-grow', nums[0] || '1'], ['flex-shrink', nums[1] || '1'], ['flex-basis', basis || (nums.length ? '0%' : 'auto')]];
    }
    case 'flex-flow': {
      const out = [];
      for (const t of tokens(v)) out.push([/wrap/.test(t) ? 'flex-wrap' : 'flex-direction', t]);
      return out;
    }
    case 'gap': case 'grid-gap': {
      const [r, c = r] = tokens(v);
      return [['row-gap', r], ['column-gap', c]];
    }
    case 'grid-row-gap': return [['row-gap', v]];
    case 'grid-column-gap': return [['column-gap', v]];
    case 'place-items': { const [a, j = a] = tokens(v); return [['align-items', a], ['justify-items', j]]; }
    case 'place-content': { const [a, j = a] = tokens(v); return [['align-content', a], ['justify-content', j]]; }
    case 'place-self': { const [a, j = a] = tokens(v); return [['align-self', a], ['justify-self', j]]; }
    case 'grid-column': case 'grid-row': {
      const [start, end] = splitTop(v, '/').map((x) => x.trim());
      return [[`${prop}-start`, start], [`${prop}-end`, end || (start.startsWith('span') || /^-?\d+$/.test(start) ? 'auto' : start)]];
    }
    case 'grid-area': {
      const parts = splitTop(v, '/').map((x) => x.trim());
      const [rs, cs = /^-?\d+$/.test(rs) || rs.startsWith('span') ? 'auto' : rs, re = cs === 'auto' ? 'auto' : rs, ce = cs] = parts;
      return [['grid-row-start', rs], ['grid-column-start', cs], ['grid-row-end', parts[2] || (/^-?\d+$/.test(rs) || rs.startsWith('span') ? 'auto' : re)], ['grid-column-end', parts[3] || (/^-?\d+$/.test(cs) || cs.startsWith('span') ? 'auto' : ce)]];
    }
    default:
      return [[prop, v]];
  }
}

// ─── Единицы и вычисление значений ──────────────────────────────────────────────────────────────────────
const ABS = { px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6 };

/** Длина → px (или null). ctx: { fontSize, rootFontSize, vw, vh, percentBase }. */
function lengthPx(raw, ctx) {
  const v = String(raw).trim().toLowerCase();
  if (v === '0') return 0;
  const m = /^(-?[\d.]+(?:e-?\d+)?)([a-z%]*)$/.exec(v);
  if (m) {
    const n = parseFloat(m[1]);
    const u = m[2];
    if (u === '') return n === 0 ? 0 : null;
    if (ABS[u]) return n * ABS[u];
    if (u === 'em') return n * ctx.fontSize;
    if (u === 'rem') return n * ctx.rootFontSize;
    if (u === 'ex') return n * ctx.fontSize * 0.5;
    if (u === 'ch') return n * ctx.fontSize * 0.5;
    if (u === 'vw') return (n * ctx.vw) / 100;
    if (u === 'vh') return (n * ctx.vh) / 100;
    if (u === 'vmin') return (n * Math.min(ctx.vw, ctx.vh)) / 100;
    if (u === 'vmax') return (n * Math.max(ctx.vw, ctx.vh)) / 100;
    if (u === '%' && ctx.percentBase !== undefined) return (n * ctx.percentBase) / 100;
    return null;
  }
  const fn = /^(calc|clamp|min|max)\((.*)\)$/.exec(v);
  if (fn) {
    const args = splitTop(fn[2], ',').map((a) => a.trim());
    if (fn[1] === 'calc') return evalCalc(fn[2], ctx);
    const vals = args.map((a) => evalCalc(a, ctx));
    if (vals.some((x) => x === null)) return null;
    if (fn[1] === 'min') return Math.min(...vals);
    if (fn[1] === 'max') return Math.max(...vals);
    if (vals.length === 3) return Math.min(Math.max(vals[1], vals[0]), vals[2]);
  }
  return null;
}

/** calc(): + − × ÷ над длинами и числами. Возвращает px (или число, если единиц нет). */
function evalCalc(expr, ctx) {
  const src = expr.replace(/\s+/g, ' ').trim();
  let i = 0;
  const peek = () => src[i];
  const skip = () => { while (src[i] === ' ') i += 1; };
  function primary() {
    skip();
    if (peek() === '(') { i += 1; const r = sum(); skip(); i += 1; return r; }
    const fm = /^(calc|clamp|min|max|var)\(/.exec(src.slice(i));
    if (fm) {
      let depth = 0; let k = i;
      for (; k < src.length; k += 1) { if (src[k] === '(') depth += 1; if (src[k] === ')') { depth -= 1; if (depth === 0) break; } }
      const whole = src.slice(i, k + 1);
      i = k + 1;
      return { v: lengthPx(whole, ctx), unit: true };
    }
    const m = /^-?[\d.]+(?:e-?\d+)?[a-z%]*/i.exec(src.slice(i));
    if (!m) throw new Error('calc');
    i += m[0].length;
    if (/^-?[\d.]+(?:e-?\d+)?$/.test(m[0])) return { v: parseFloat(m[0]), unit: false };
    return { v: lengthPx(m[0], ctx), unit: true };
  }
  function product() {
    let left = primary();
    for (;;) {
      skip();
      const op = peek();
      if (op !== '*' && op !== '/') return left;
      i += 1;
      const right = primary();
      if (left.v === null || right.v === null) return { v: null, unit: true };
      left = op === '*' ? { v: left.v * right.v, unit: left.unit || right.unit } : { v: left.v / right.v, unit: left.unit };
    }
  }
  function sum() {
    let left = product();
    for (;;) {
      skip();
      const op = peek();
      if (op !== '+' && op !== '-') return left;
      i += 1;
      const right = product();
      if (left.v === null || right.v === null) return { v: null, unit: true };
      left = { v: op === '+' ? left.v + right.v : left.v - right.v, unit: left.unit || right.unit };
    }
  }
  try {
    const r = sum();
    return r.v === null ? null : r.v;
  } catch (e) {
    return null;
  }
}

const px = (n) => `${round(n, 1)}px`;
const FONT_KEYWORDS = { 'xx-small': 9, 'x-small': 10, small: 13, medium: 16, large: 18, 'x-large': 24, 'xx-large': 32, 'xxx-large': 48 };
const WEIGHTS = { normal: 400, bold: 700 };

function normalizeTime(t) {
  const s = t.trim().toLowerCase();
  const m = /^(-?[\d.]+)(m?s)$/.exec(s);
  if (!m) return s;
  return `${round(m[2] === 'ms' ? parseFloat(m[1]) / 1000 : parseFloat(m[1]), 3)}s`;
}
const listOf = (v, fn) => splitTop(v, ',').map((x) => fn(x.trim())).join(', ');

function normalizeShadow(v, ctx, currentColor) {
  if (v.trim().toLowerCase() === 'none') return 'none';
  return splitTop(v, ',').map((one) => {
    let color = null; let inset = false; const lens = [];
    for (const t of tokens(one)) {
      if (t.toLowerCase() === 'inset') inset = true;
      else if (isLength(t) && !['thin', 'medium', 'thick'].includes(t)) lens.push(px(lengthPx(t, ctx) ?? 0));
      else color = t.toLowerCase() === 'currentcolor' ? currentColor : parseColor(t) || t;
    }
    while (lens.length < 2) lens.push('0px');
    if (lens.length < 3) lens.push('0px');
    return `${color || currentColor} ${lens.join(' ')}${inset ? ' inset' : ''}`;
  }).join(', ');
}

/** transform → нормализованная строка: 2D-матрица (если всё в px/deg), иначе исходный текст без лишних пробелов. */
function normalizeTransform(v, ctx) {
  const s = v.trim().toLowerCase();
  if (s === 'none') return 'none';
  const funcs = [...s.matchAll(/([a-z0-9]+)\(([^)]*)\)/g)];
  if (!funcs.length) return s;
  let m = [1, 0, 0, 1, 0, 0];
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const angle = (a) => {
    const t = a.trim();
    const n = parseFloat(t);
    if (t.endsWith('grad')) return (n * Math.PI) / 200;
    if (t.endsWith('rad')) return n;
    if (t.endsWith('turn')) return n * 2 * Math.PI;
    return (n * Math.PI) / 180;
  };
  for (const [, name, argStr] of funcs) {
    const args = argStr.split(',').map((a) => a.trim()).filter(Boolean);
    const len = (a) => { if (/%$/.test(a)) throw new Error('percent'); const r = lengthPx(a, ctx); if (r === null) throw new Error('len'); return r; };
    try {
      switch (name) {
        case 'translate': m = mul(m, [1, 0, 0, 1, len(args[0]), args[1] ? len(args[1]) : 0]); break;
        case 'translatex': m = mul(m, [1, 0, 0, 1, len(args[0]), 0]); break;
        case 'translatey': m = mul(m, [1, 0, 0, 1, 0, len(args[0])]); break;
        case 'scale': { const x = parseFloat(args[0]); const y = args[1] ? parseFloat(args[1]) : x; m = mul(m, [x, 0, 0, y, 0, 0]); break; }
        case 'scalex': m = mul(m, [parseFloat(args[0]), 0, 0, 1, 0, 0]); break;
        case 'scaley': m = mul(m, [1, 0, 0, parseFloat(args[0]), 0, 0]); break;
        case 'rotate': case 'rotatez': { const a = angle(args[0]); m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); break; }
        case 'skew': { const ax = angle(args[0]); const ay = args[1] ? angle(args[1]) : 0; m = mul(m, [1, Math.tan(ay), Math.tan(ax), 1, 0, 0]); break; }
        case 'skewx': m = mul(m, [1, 0, Math.tan(angle(args[0])), 1, 0, 0]); break;
        case 'skewy': m = mul(m, [1, Math.tan(angle(args[0])), 0, 1, 0, 0]); break;
        case 'matrix': m = mul(m, args.map(Number)); break;
        default: return s.replace(/\s+/g, ' ');
      }
    } catch (e) {
      return s.replace(/\s+/g, ' ').replace(/\(\s*/g, '(').replace(/\s*,\s*/g, ', ');
    }
  }
  return `matrix(${m.map((x) => round(x, 3) || 0).join(', ')})`;
}

// ─── Каскад ─────────────────────────────────────────────────────────────────────────────────────────────
function prepareSheets(studentCss, html) {
  const doc = buildDocument(html);
  const sheets = [
    { origin: 0, rules: parseCss(UA_CSS) },
    { origin: 1, rules: parseCss(studentCss) },
    ...doc.styles.map((css) => ({ origin: 1, rules: parseCss(css) })),
  ];
  // Плоский список (правило, селектор) с порядком.
  const entries = [];
  let order = 0;
  sheets.forEach((sheet, si) => {
    for (const rule of sheet.rules) {
      for (const selText of rule.selectors) {
        const sel = parseSelector(selText);
        order += 1;
        if (!sel) continue;
        entries.push({ origin: sheet.origin, sheet: si, sel, decls: rule.decls, media: rule.media, order });
      }
    }
  });
  return { doc, entries };
}

/** Итоговые (каскадные) объявления элемента: Map свойство → значение (после var() и разворота сокращений). */
function cascade(node, pseudo, entries, env, parentCustom) {
  const matched = [];
  for (const e of entries) {
    if ((e.sel.pseudoElement || null) !== (pseudo || null)) continue;
    if (e.media.length && !e.media.every((q) => mediaMatches(q, env))) continue;
    if (!matchesSelector(node, e.sel, env)) continue;
    e.decls.forEach((d, di) => matched.push({ ...d, origin: e.origin, spec: e.sel.specificity, order: e.order, di }));
  }
  const rank = (d) => (d.important ? (d.origin === 0 ? 3 : 2) : d.origin === 0 ? 0 : 1);
  matched.sort((a, b) => rank(a) - rank(b) || cmpSpec(a.spec, b.spec) || a.order - b.order || a.di - b.di);
  // Пользовательские свойства (наследуются).
  const custom = new Map(parentCustom || []);
  for (const d of matched) if (d.prop.startsWith('--')) custom.set(d.prop, d.value);
  const resolveVars = (value, depth = 0) => {
    if (depth > 8 || !/var\(/i.test(value)) return value;
    return resolveVars(value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/gi, (all, name, fallback) => {
      if (custom.has(name)) return custom.get(name);
      return fallback !== undefined ? fallback.trim() : 'unset';
    }), depth + 1);
  };
  const declared = new Map();
  for (const d of matched) {
    if (d.prop.startsWith('--')) continue;
    const value = resolveVars(d.value);
    for (const [p, v] of expand(d.prop, value)) declared.set(p, v);
  }
  return { declared, custom };
}

/** Вычисленные значения сравниваемых свойств элемента (и ::before/::after). */
function computeTree(doc, entries, env) {
  const result = new Map();
  const rootFs = { value: 16 };
  function compute(node, parent, pseudo) {
    const { declared, custom } = cascade(node, pseudo, entries, env, parent ? parent.custom : null);
    const out = { custom };
    const parentVal = (p) => (parent ? parent.values[p] : undefined);
    const get = (p) => {
      let v = declared.get(p);
      const low = v === undefined ? undefined : v.trim().toLowerCase();
      if (low === 'inherit' || ((low === 'unset' || low === 'revert' || low === 'revert-layer') && INHERITED.has(p))) return { inherit: true };
      if (low === 'initial' || low === 'unset' || low === 'revert' || low === 'revert-layer') return { value: INITIAL[p] };
      if (v === undefined) return INHERITED.has(p) && parent ? { inherit: true } : { value: INITIAL[p] };
      return { value: v };
    };
    const values = {};
    // font-size — первым: от него считаются em.
    const parentFs = parent ? parent.fontSize : 16;
    let fs = parentFs;
    const fsd = get('font-size');
    if (!fsd.inherit && fsd.value !== undefined) {
      const raw = String(fsd.value).trim().toLowerCase();
      if (FONT_KEYWORDS[raw]) fs = FONT_KEYWORDS[raw];
      else if (raw === 'smaller') fs = parentFs / 1.2;
      else if (raw === 'larger') fs = parentFs * 1.2;
      else {
        const r = lengthPx(raw, { fontSize: parentFs, rootFontSize: rootFs.value, vw: env.width, vh: env.height, percentBase: parentFs });
        if (r !== null) fs = r;
      }
    }
    if (node.tag === 'html' && !pseudo) rootFs.value = fs;
    out.fontSize = fs;
    values['font-size'] = px(fs);
    const ctx = { fontSize: fs, rootFontSize: rootFs.value, vw: env.width, vh: env.height };
    const val = (p) => {
      const d = get(p);
      if (d.inherit) return parentVal(p) ?? normalize(p, INITIAL[p]);
      return normalize(p, d.value);
    };
    // color — до свойств с currentcolor.
    values.color = (() => {
      const d = get('color');
      if (d.inherit) return parentVal('color') ?? 'rgba(0,0,0,1)';
      const raw = String(d.value).trim().toLowerCase();
      if (raw === 'currentcolor') return parentVal('color') ?? 'rgba(0,0,0,1)';
      if (raw === 'canvastext') return 'rgba(0,0,0,1)';
      return parseColor(raw) || parentVal('color') || 'rgba(0,0,0,1)';
    })();
    function normalize(p, raw) {
      const v = String(raw ?? '').trim();
      const low = v.toLowerCase();
      if (/color$/.test(p)) {
        if (low === 'currentcolor') return values.color;
        if (low === 'canvastext') return 'rgba(0,0,0,1)';
        if (low === '-webkit-focus-ring-color') return low;
        return parseColor(low) || low;
      }
      if (p === 'font-weight') {
        if (WEIGHTS[low]) return String(WEIGHTS[low]);
        const pw = Number(parentVal('font-weight') || 400);
        if (low === 'bolder') return String(pw < 350 ? 400 : pw < 550 ? 700 : 900);
        if (low === 'lighter') return String(pw < 550 ? 100 : pw < 750 ? 400 : 700);
        return low;
      }
      if (p === 'font-family') return low.replace(/["']/g, '').split(',').map((s) => s.trim()).join(', ');
      if (p === 'line-height') {
        if (low === 'normal' || /^[\d.]+$/.test(low)) return low === 'normal' ? low : String(round(parseFloat(low), 3));
        const r = lengthPx(low, { ...ctx, percentBase: fs });
        return r === null ? low : px(r);
      }
      if (p === 'letter-spacing' || p === 'word-spacing') {
        if (low === 'normal') return p === 'letter-spacing' ? 'normal' : '0px';
        const r = lengthPx(low, ctx);
        return r === null ? low : px(r);
      }
      if (/^border-.*-width$/.test(p) || p === 'outline-width') {
        const kw = { thin: 1, medium: 3, thick: 5 }[low];
        const r = kw !== undefined ? kw : lengthPx(low, ctx);
        return r === null ? low : px(r);
      }
      if (p === 'outline-offset') { const r = lengthPx(low, ctx); return r === null ? low : px(r); }
      if (/radius$/.test(p)) {
        return low.split(/\s+/).map((t) => { if (t.endsWith('%')) return t; const r = lengthPx(t, ctx); return r === null ? t : px(r); }).filter((x, i, a) => !(i === 1 && x === a[0])).join(' ');
      }
      if (p === 'box-shadow' || p === 'text-shadow') return normalizeShadow(v, ctx, values.color);
      if (p === 'transform') return normalizeTransform(v, ctx);
      if (/^(transition|animation)-(duration|delay)$/.test(p)) return listOf(low, normalizeTime);
      if (/timing-function$/.test(p)) return listOf(low, (x) => x.replace(/\s+/g, ''));
      if (p === 'opacity') { const n = low.endsWith('%') ? parseFloat(low) / 100 : parseFloat(low); return Number.isFinite(n) ? String(round(clamp01(n), 3)) : low; }
      if (p === 'background-image') return low.replace(/\s+/g, ' ').replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, 'url($1)').replace(/\(\s*/g, '(').replace(/\s*,\s*/g, ', ').replace(/\s*\)/g, ')').replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g, (c) => parseColor(c) || c).replace(/\b[a-z]+\b/g, (w) => (NAMED[w] ? parseColor(w) : w));
      if (p === 'content') return low === 'normal' || low === 'none' ? 'none' : v.replace(/^'(.*)'$/, '"$1"');
      if (p === 'text-decoration-line') return low.split(/\s+/).sort().join(' ');
      if (p === 'margin-right') { const r = lengthPx(low, ctx); return r === null ? low : px(r); }
      return low.replace(/\s+/g, ' ');
    }
    const list = pseudo === 'first-letter' ? LETTER_COMPARED : pseudo ? PSEUDO_COMPARED : COMPARED;
    const props = list.filter((p) => p !== 'font-size' && p !== 'color');
    for (const p of props) values[p] = val(p);
    // Рамка без стиля имеет нулевую толщину (как вычисляет браузер).
    for (const side of SIDES) {
      if (values[`border-${side}-style`] === 'none' || values[`border-${side}-style`] === 'hidden') values[`border-${side}-width`] = '0px';
    }
    if (values['outline-style'] === 'none') values['outline-width'] = '0px';
    if (pseudo) values.content = val('content');
    out.values = values;
    if (!pseudo) {
      const layout = {};
      for (const p of LAYOUT) {
        const d = get(p);
        const raw = d.inherit ? (parent && parent.layout ? parent.layout[p] : INITIAL[p]) : d.value;
        layout[p] = normalizeLayout(p, raw, ctx);
      }
      out.layout = layout;
    }
    return out;
  }
  function walk(node, parentInfo) {
    const info = compute(node, parentInfo, null);
    result.set(node, info);
    for (const pseudo of ['before', 'after']) {
      const p = compute(node, info, pseudo);
      info[pseudo] = p.values.content && p.values.content !== 'none' ? p : null;
    }
    // ::first-letter — у элементов, которые начинаются с текста (буквица).
    info.letter = node.text && node.children.length === 0 ? compute(node, info, 'first-letter') : null;
    node.children.forEach((c) => walk(c, info));
  }
  walk(doc.root, null);
  return result;
}

const ALIGN_ALIASES = { 'flex-start': 'start', 'flex-end': 'end', left: 'start', right: 'end', 'self-start': 'start', 'self-end': 'end' };

function expandRepeat(v) {
  return v.replace(/repeat\(\s*(\d+)\s*,\s*((?:[^()]|\([^()]*\))*)\)/gi, (all, n, track) => Array(Number(n)).fill(track.trim()).join(' '));
}

function normalizeLayout(p, raw, ctx) {
  const v = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (/^(justify|align)-(content|items|self)$/.test(p)) {
    let x = ALIGN_ALIASES[v] || v;
    if (p === 'align-items' && x === 'normal') x = 'stretch';
    if (p === 'justify-content' && x === 'normal') x = 'start';
    if (p === 'align-self' || p === 'justify-self') x = x === 'auto' ? 'auto' : x;
    return x;
  }
  if (/^grid-template-(columns|rows)$|^grid-auto-(rows|columns)$/.test(p)) {
    return expandRepeat(v).split(' ').map((t) => { const r = /^-?[\d.]+(px|em|rem|vw|vh)$/.test(t) ? lengthPx(t, ctx) : null; return r === null ? t : px(r); }).join(' ');
  }
  if (p === 'grid-template-areas') return v === 'none' ? v : [...v.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => (m[1] ?? m[2]).trim().replace(/\s+/g, ' ')).join(' | ');
  if (/^(top|right|bottom|left|width|height|min-width|max-width|min-height|max-height|flex-basis|row-gap|column-gap)$|^(margin|padding)-/.test(p)) {
    if (/^(auto|none|normal|content|max-content|min-content|fit-content)$/.test(v) || v.includes('%')) return v === '0%' && p === 'flex-basis' ? '0px' : v;
    const r = lengthPx(v, ctx);
    return r === null ? v : px(r);
  }
  return v;
}

function nodeLabel(node) {
  if (node.tag === 'html') return 'страница (html)';
  if (node.tag === 'body') return 'страница (body)';
  let text = '<' + node.tag;
  if (node.attrs.get('id')) text += ` id="${node.attrs.get('id')}"`;
  if (node.classList.length) text += ` class="${node.classList.join(' ')}"`;
  text += '>';
  if (node.text) text += ` «${node.text.length > 24 ? node.text.slice(0, 24) + '…' : node.text}»`;
  return text;
}

function compareLayout(a, b, docA, docB, where) {
  const diffs = [];
  for (let i = 0; i < docB.elements.length; i += 1) {
    const va = a.get(docA.elements[i]);
    const vb = b.get(docB.elements[i]);
    if (!va || !vb || !va.layout || !vb.layout) continue;
    for (const p of LAYOUT) {
      if (va.layout[p] !== vb.layout[p]) diffs.push({ where, el: nodeLabel(docB.elements[i]), prop: p, yours: va.layout[p], expected: vb.layout[p] });
    }
  }
  return diffs;
}

function compareComputed(a, b, docA, docB, where) {
  const diffs = [];
  const list = (doc) => doc.elements;
  const ea = list(docA);
  const eb = list(docB);
  for (let i = 0; i < eb.length; i += 1) {
    const va = a.get(ea[i]);
    const vb = b.get(eb[i]);
    if (!va || !vb) continue;
    // Цвета, взятые из color (currentcolor), при другом цвете текста — одна причина.
    const colorDiffers = va.values.color !== vb.values.color;
    for (const p of COMPARED) {
      if (va.values[p] === vb.values[p]) continue;
      if (colorDiffers && (/^border-.*-color$|^text-decoration-color$|^outline-color$/.test(p)) && va.values[p] === va.values.color && vb.values[p] === vb.values.color) continue;
      if (p === 'outline-color' && va.values['outline-width'] === '0px' && vb.values['outline-width'] === '0px') continue;
      if (/^border-(\w+)-color$/.test(p)) {
        const side = /^border-(\w+)-color$/.exec(p)[1];
        if (va.values[`border-${side}-width`] === '0px' && vb.values[`border-${side}-width`] === '0px') continue;
      }
      if (p === 'text-decoration-color' || p === 'text-decoration-style') { if (va.values['text-decoration-line'] === 'none' && vb.values['text-decoration-line'] === 'none') continue; }
      if (/^transition-(timing-function|delay)$/.test(p) && va.values['transition-duration'] === '0s' && vb.values['transition-duration'] === '0s') continue;
      if (/^animation-(?!duration)/.test(p) && va.values['animation-duration'] === '0s' && vb.values['animation-duration'] === '0s') continue;
      diffs.push({ where, el: nodeLabel(eb[i]), prop: label(p), property: p, yours: va.values[p], expected: vb.values[p] });
    }
    if (va.letter && vb.letter) {
      for (const p of LETTER_COMPARED) {
        if (va.letter.values[p] !== vb.letter.values[p]) diffs.push({ where, el: nodeLabel(eb[i]), prop: `первая буква (::first-letter): ${label(p)}`, property: p, yours: va.letter.values[p], expected: vb.letter.values[p] });
      }
    }
    for (const pseudo of ['before', 'after']) {
      const pa = va[pseudo];
      const pb = vb[pseudo];
      if (!pa && !pb) continue;
      if (!pa || !pb) { diffs.push({ where, el: nodeLabel(eb[i]), prop: `::${pseudo}`, property: `::${pseudo}`, yours: pa ? 'есть' : 'нет', expected: pb ? 'есть' : 'нет' }); continue; }
      for (const p of PSEUDO_COMPARED) {
        if (pa.values[p] !== pb.values[p]) diffs.push({ where, el: nodeLabel(eb[i]), prop: `::${pseudo}: ${label(p)}`, property: p, yours: pa.values[p], expected: pb.values[p] });
      }
    }
  }
  return diffs;
}

const FRAME_HEIGHT = 700;

function stateEnv(doc, states, width, extra) {
  const env = { width, height: FRAME_HEIGHT, states: [], checked: new Set() };
  for (const s of extra || []) {
    const sel = parseSelector(s.selector);
    if (!sel) continue;
    const nodes = doc.elements.filter((n) => matchesSelector(n, sel, { ...env, states: [] }));
    if (s.state === 'checked') nodes.forEach((n) => env.checked.add(n));
    else env.states.push({ state: s.state, nodes });
  }
  // Отмеченные в разметке флажки остаются отмеченными.
  doc.elements.filter((n) => n.attrs.has('checked')).forEach((n) => env.checked.add(n));
  return env;
}

/**
 * Перепроверка: { ok, diffs: [{ where, el, prop, yours, expected }] } — видимые стили CSS студента против эталона на
 * каждой ширине и в каждом состоянии задания. Раскладку не сравнивает.
 */
function checkCss(task, studentCss) {
  const widths = task.widths && task.widths.length ? task.widths : [800];
  const states = task.states || [];
  const A = prepareSheets(studentCss, task.html);
  const B = prepareSheets(task.css, task.html);
  const layoutDiffs = [];
  for (const width of widths) {
    for (const state of [null, ...states]) {
      const where = [widths.length > 1 ? `ширина ${width}px` : '', state ? stateLabel(state) : ''].filter(Boolean).join(', ');
      const envA = stateEnv(A.doc, states, width, state ? [state] : []);
      const envB = stateEnv(B.doc, states, width, state ? [state] : []);
      const ta = computeTree(A.doc, A.entries, envA);
      const tb = computeTree(B.doc, B.entries, envB);
      if (!state) layoutDiffs.push(...compareLayout(ta, tb, A.doc, B.doc, where));
      const diffs = compareComputed(ta, tb, A.doc, B.doc, where);
      if (diffs.length) return { ok: false, diffs, layoutDiffs };
    }
  }
  return { ok: true, diffs: [], layoutDiffs };
}

function stateLabel(state) {
  const names = { hover: 'при наведении', focus: 'в фокусе', active: 'при нажатии', 'focus-within': 'в фокусе внутри', 'focus-visible': 'в фокусе', checked: 'когда отмечено' };
  return `${names[state.state] || state.state} на ${state.selector}`;
}

module.exports = { checkCss, parseCss, parseSelector, parseColor, expand, lengthPx, matchesSelector, buildDocument, mediaMatches };
