// Проверка заданий предмета «Web-разработка: CSS» (src/lib/css-course): одна и та же разметка рисуется с CSS
// студента и с эталонным CSS в двух невидимых iframe одинакового размера, затем сравниваются попарно все элементы:
// положение и размер (getBoundingClientRect) и видимые стили (цвета, шрифт, рамки, тени, фон, прозрачность,
// трансформации, длительность и характер переходов, анимации, ::before/::after). Какие именно свойства названы в
// transition, не сравнивается: «background» и «background-color» дают одно и то же, а конечный вид проверяется. Свойства раскладки (flex, grid, margin, padding…)
// напрямую не сравниваются — важно, чтобы получилось так же; обязательные приёмы задаются правилами задания.
// Проверяется каждая ширина задания (widths), каждое состояние (states: :hover/:focus/:active через атрибут
// data-force-*, :checked — отметкой поля) и анимации в нескольких точках (через Web Animations API).
// Используется страницей практики (public/js/css-course.js) и скриптом scripts/css-course/verify.js.
(function (root) {
  const FRAME_HEIGHT = 700;
  const RECT_TOLERANCE = 1.5;
  const CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:";
  // Фон у html не задаётся: иначе фон body не растекался бы на всё окно, как в обычном браузере.
  const BASE_CSS = ':root { color-scheme: light; } html { font-family: "Open Sans", sans-serif; color: #222222; }';
  const FORCEABLE = ['hover', 'focus', 'active', 'focus-within', 'focus-visible'];

  // Свойство → подпись для подсказки.
  const PROPS = {
    color: 'цвет текста',
    'background-color': 'цвет фона',
    'background-image': 'фоновое изображение или градиент',
    'background-size': 'размер фона',
    'background-position': 'положение фона',
    'background-repeat': 'повтор фона',
    'font-family': 'шрифт',
    'font-size': 'размер шрифта',
    'font-weight': 'насыщенность шрифта',
    'font-style': 'начертание (курсив)',
    'line-height': 'высота строки',
    'text-align': 'выравнивание текста',
    'text-decoration-line': 'подчёркивание / зачёркивание',
    'text-decoration-style': 'стиль линии текста',
    'text-decoration-color': 'цвет линии текста',
    'text-transform': 'регистр букв',
    'letter-spacing': 'расстояние между буквами',
    'word-spacing': 'расстояние между словами',
    'text-indent': 'отступ первой строки',
    'text-shadow': 'тень текста',
    'white-space': 'перенос строк',
    'vertical-align': 'вертикальное выравнивание',
    'list-style-type': 'маркер списка',
    'list-style-position': 'положение маркера',
    'border-top-width': 'толщина рамки сверху',
    'border-right-width': 'толщина рамки справа',
    'border-bottom-width': 'толщина рамки снизу',
    'border-left-width': 'толщина рамки слева',
    'border-top-style': 'стиль рамки сверху',
    'border-right-style': 'стиль рамки справа',
    'border-bottom-style': 'стиль рамки снизу',
    'border-left-style': 'стиль рамки слева',
    'border-top-color': 'цвет рамки сверху',
    'border-right-color': 'цвет рамки справа',
    'border-bottom-color': 'цвет рамки снизу',
    'border-left-color': 'цвет рамки слева',
    'border-top-left-radius': 'скругление углов',
    'border-top-right-radius': 'скругление углов',
    'border-bottom-right-radius': 'скругление углов',
    'border-bottom-left-radius': 'скругление углов',
    'border-collapse': 'слияние рамок таблицы',
    'box-shadow': 'тень блока',
    'outline-style': 'стиль контура',
    'outline-width': 'толщина контура',
    'outline-color': 'цвет контура',
    'outline-offset': 'отступ контура',
    'text-overflow': 'обрезка текста многоточием',
    opacity: 'прозрачность',
    visibility: 'видимость',
    'z-index': 'порядок наложения (z-index)',
    'overflow-x': 'обрезка содержимого (overflow)',
    'overflow-y': 'обрезка содержимого (overflow)',
    cursor: 'курсор',
    transform: 'трансформация',
    'transform-origin': 'точка трансформации',
    'transition-duration': 'плавный переход: длительность',
    'transition-timing-function': 'плавный переход: характер движения',
    'transition-delay': 'плавный переход: задержка',
    'animation-duration': 'анимация: длительность',
    'animation-timing-function': 'анимация: характер движения',
    'animation-delay': 'анимация: задержка',
    'animation-iteration-count': 'анимация: число повторов',
    'animation-direction': 'анимация: направление',
    'animation-fill-mode': 'анимация: состояние до и после',
    'object-fit': 'вписывание картинки',
    'aspect-ratio': 'пропорции',
  };
  const PSEUDO_PROPS = ['content', 'color', 'background-color', 'font-size', 'font-weight', 'width', 'height', 'border-top-width', 'border-top-style', 'border-top-color', 'border-top-left-radius', 'transform', 'opacity', 'display', 'position', 'top', 'left', 'right', 'bottom'];
  const LETTER_PROPS = ['font-size', 'font-weight', 'color', 'float', 'line-height', 'margin-right', 'background-color', 'text-transform'];
  const PROP_NAMES = Object.keys(PROPS);
  // Цвета, которые по умолчанию берутся из color (currentColor): при другом цвете текста они тоже другие — одна причина.
  const FOLLOW_COLOR = ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'text-decoration-color', 'outline-color'];
  const RECT_LABELS = { x: 'положение по горизонтали', y: 'положение по вертикали', w: 'ширина', h: 'высота' };

  function escapeStyle(css) {
    return String(css || '').replace(/<\/style/gi, '<\\/style');
  }

  /** Документ для iframe: разметка задания + CSS (студента или эталон). */
  function documentHtml(html, css) {
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
      + '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">'
      + '<link rel="stylesheet" href="/vendor/fonts/fonts.css">'
      + '<style>' + BASE_CSS + '</style><style id="user-css">' + escapeStyle(css) + '</style></head><body>'
      + String(html || '') + '</body></html>';
  }

  function makeFrame(width) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-20000px;top:0;border:0;visibility:hidden;pointer-events:none;width:' + width + 'px;height:' + FRAME_HEIGHT + 'px';
    document.body.append(frame);
    return frame;
  }

  function load(frame, html, css) {
    return new Promise((resolve) => {
      frame.addEventListener('load', resolve, { once: true });
      frame.srcdoc = documentHtml(html, css);
    }).then(() => settle(frame.contentDocument));
  }

  // Дождаться шрифтов и картинок.
  function settle(doc) {
    const images = [...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; })));
    return Promise.all([doc.fonts ? doc.fonts.ready : null, ...images]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }

  const num = (v) => Math.round(parseFloat(v) * 10) / 10;
  function normalize(prop, value) {
    let v = String(value || '').trim().replace(/\s+/g, ' ');
    if (prop === 'font-family') v = v.replace(/["']/g, '').toLowerCase();
    // Числа с дробной частью — до десятых, чтобы не спотыкаться о 13.3333px.
    v = v.replace(/-?\d+\.\d+/g, (m) => String(Math.round(parseFloat(m) * 10) / 10));
    return v;
  }

  function label(el) {
    if (el.tagName === 'HTML') return 'страница (html)';
    if (el.tagName === 'BODY') return 'страница (body)';
    let text = '<' + el.tagName.toLowerCase();
    if (el.id) text += ' id="' + el.id + '"';
    if (el.classList.length) text += ' class="' + [...el.classList].join(' ') + '"';
    text += '>';
    const words = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (words) text += ' «' + (words.length > 24 ? words.slice(0, 24) + '…' : words) + '»';
    return text;
  }

  function elements(doc) {
    return [doc.documentElement, doc.body, ...doc.body.querySelectorAll('*')];
  }

  function readPseudo(view, el, which) {
    const cs = view.getComputedStyle(el, which);
    if (!cs || cs.content === 'none' || cs.content === 'normal') return null;
    const out = {};
    PSEUDO_PROPS.forEach((p) => { out[p] = normalize(p, cs.getPropertyValue(p)); });
    return out;
  }

  // ::first-letter (буквица) — только у элементов, которые начинаются с текста.
  function readLetter(view, el) {
    const first = el.firstChild;
    if (!first || first.nodeType !== 3 || !first.textContent.trim()) return null;
    const cs = view.getComputedStyle(el, '::first-letter');
    const out = {};
    LETTER_PROPS.forEach((p) => { out[p] = normalize(p, cs.getPropertyValue(p)); });
    return out;
  }

  /** Снимок документа: по каждому элементу — прямоугольник и видимые стили. */
  function snapshot(doc) {
    const view = doc.defaultView;
    const sx = view.scrollX;
    const sy = view.scrollY;
    return elements(doc).map((el) => {
      const r = el.getBoundingClientRect();
      const cs = view.getComputedStyle(el);
      const style = {};
      PROP_NAMES.forEach((p) => { style[p] = normalize(p, cs.getPropertyValue(p)); });
      // Точка трансформации считается от размера элемента: без трансформации она ни на что не влияет.
      if (style.transform === 'none') style['transform-origin'] = '';
      return {
        el,
        rect: { x: num(r.left + sx), y: num(r.top + sy), w: num(r.width), h: num(r.height) },
        style,
        before: readPseudo(view, el, '::before'),
        letter: readLetter(view, el),
        after: readPseudo(view, el, '::after'),
      };
    });
  }

  // :hover и др. нельзя включить из скрипта: для каждого правила с таким псевдоклассом добавляется копия, где он
  // заменён атрибутом data-force-<state>; атрибут ставится на нужные элементы.
  function addForcedRules(doc) {
    let text = '';
    const res = FORCEABLE.map((s) => [s, new RegExp(':' + s + '(?![\\w-])', 'g')]);
    function walk(rules, wrap) {
      for (const rule of rules) {
        if (rule.selectorText !== undefined && rule.style) {
          let sel = rule.selectorText;
          let changed = false;
          res.forEach(([s, re]) => { if (re.test(sel)) { changed = true; sel = sel.replace(re, '[data-force-' + s + ']'); } re.lastIndex = 0; });
          if (changed) text += wrap(sel + '{' + rule.style.cssText + '}');
        } else if (rule.cssRules && rule.media) {
          walk(rule.cssRules, (t) => wrap('@media ' + rule.media.mediaText + '{' + t + '}'));
        } else if (rule.cssRules && rule.conditionText !== undefined) {
          walk(rule.cssRules, (t) => wrap('@supports ' + rule.conditionText + '{' + t + '}'));
        }
      }
    }
    for (const sheet of doc.styleSheets) {
      try { walk(sheet.cssRules, (t) => t); } catch (e) { /* чужая таблица — пропускаем */ }
    }
    const style = doc.createElement('style');
    style.textContent = text;
    doc.head.append(style);
  }

  function noMotion(doc) {
    const style = doc.createElement('style');
    style.textContent = '*, *::before, *::after { transition: none !important; }';
    doc.head.append(style);
  }

  function setState(doc, state, on) {
    doc.querySelectorAll(state.selector).forEach((el) => {
      if (state.state === 'checked') el.checked = on;
      else if (on) el.setAttribute('data-force-' + state.state, '');
      else el.removeAttribute('data-force-' + state.state);
    });
  }

  // Анимации — в нескольких точках каждого повтора (от начала, с учётом задержки).
  const ANIMATION_POINTS = [0, 0.25, 0.5, 0.75];
  function seekAnimations(doc, point) {
    const anims = doc.getAnimations ? doc.getAnimations() : [];
    anims.forEach((a) => {
      a.pause();
      const t = a.effect.getComputedTiming();
      const duration = typeof t.duration === 'number' ? t.duration : 0;
      a.currentTime = (t.delay || 0) + duration * point + (point === 0 ? 0.5 : 0);
    });
    return anims.length;
  }

  function compareSnapshots(student, expected, where) {
    const problems = [];
    if (student.length !== expected.length) {
      problems.push({ where, text: 'Разметка изменилась — CSS не должен добавлять или убирать элементы.' });
      return problems;
    }
    // Размер и положение: называем причину, а не следствия. Высота растёт снизу вверх (родитель выше из-за детей),
    // ширина и сдвиг — сверху вниз и по ходу страницы (ребёнок уже, потому что уже родитель; блок ниже, потому что
    // выше него что-то выросло).
    const diffs = expected.map((b, i) => ['w', 'h', 'x', 'y'].filter((k) => Math.abs(student[i].rect[k] - b.rect[k]) > RECT_TOLERANCE));
    const only = (keys, allowed) => keys.every((k) => allowed.includes(k));
    const explained = (i) => {
      const keys = diffs[i];
      const el = expected[i].el;
      // Сдвиг объясняет только расхождение выше по странице, но не у своего предка (иначе предок и ребёнок
      // «объясняли» бы друг друга и не был бы назван никто).
      const before = expected.some((e, j) => j < i && diffs[j].length && !e.el.contains(el));
      const inside = expected.some((e, j) => j > i && diffs[j].length && el.contains(e.el));
      const parentWidth = expected.some((e, j) => j < i && diffs[j].some((k) => k === 'w' || k === 'x') && e.el.contains(el));
      if (only(keys, ['x', 'y']) && before) return true;
      if (only(keys, ['h', 'y']) && inside) return true;
      if (parentWidth) return true;
      return false;
    };
    let rectNamed = false;
    for (let i = 0; i < expected.length; i += 1) {
      const a = student[i];
      const b = expected[i];
      if (diffs[i].length && !explained(i)) {
        rectNamed = true;
        const key = diffs[i][0];
        problems.push({ where, el: label(b.el), prop: RECT_LABELS[key], text: RECT_LABELS[key] + ': у вас ' + a.rect[key] + 'px, нужно ' + b.rect[key] + 'px', rect: true });
      }
      const colorDiffers = a.style.color !== b.style.color;
      for (const p of PROP_NAMES) {
        if (colorDiffers && FOLLOW_COLOR.includes(p) && a.style[p] === a.style.color && b.style[p] === b.style.color) continue;
        if (a.style[p] !== b.style[p]) problems.push({ where, el: label(b.el), prop: PROPS[p], text: PROPS[p] + ' — не как в образце' });
      }
      if (a.letter && b.letter) {
        // Первая буква наследует размер и цвет элемента — расхождение элемента уже названо.
        const own = (snap, p) => snap.letter[p] !== snap.style[p];
        const diff = LETTER_PROPS.find((p) => a.letter[p] !== b.letter[p] && (own(a, p) || own(b, p)));
        if (diff) problems.push({ where, el: label(b.el), prop: '::first-letter', text: 'первая буква (::first-letter): ' + diff + ' — не как в образце' });
      }
      for (const which of ['before', 'after']) {
        const pa = a[which];
        const pb = b[which];
        if (!pa && !pb) continue;
        if (!pa || !pb) {
          problems.push({ where, el: label(b.el), prop: '::' + which, text: '::' + which + (pb ? ' — нужен' : ' — лишний') });
          continue;
        }
        const diff = PSEUDO_PROPS.find((p) => pa[p] !== pb[p]);
        if (diff) problems.push({ where, el: label(b.el), prop: '::' + which, text: '::' + which + ': ' + diff + ' — не как в образце' });
      }
    }
    // Расхождение есть, но все «объяснены» друг другом — назвать хотя бы последнее (проверка не должна пройти).
    if (!rectNamed && diffs.some((d) => d.length)) {
      const i = diffs.map((d) => d.length > 0).lastIndexOf(true);
      const key = diffs[i][0];
      problems.push({ where, el: label(expected[i].el), prop: RECT_LABELS[key], text: RECT_LABELS[key] + ': у вас ' + student[i].rect[key] + 'px, нужно ' + expected[i].rect[key] + 'px', rect: true });
    }
    return problems;
  }

  async function compareAt(task, studentCss, refCss, width) {
    const fa = makeFrame(width);
    const fb = makeFrame(width);
    try {
      await Promise.all([load(fa, task.html, studentCss), load(fb, task.html, refCss)]);
      const da = fa.contentDocument;
      const db = fb.contentDocument;
      const where = task.widths.length > 1 ? 'ширина ' + width + 'px' : '';
      // Анимации: в начальной точке и по ходу.
      const hasAnims = seekAnimations(da, 0) + seekAnimations(db, 0) > 0;
      let problems = compareSnapshots(snapshot(da), snapshot(db), where);
      if (hasAnims) {
        for (const point of ANIMATION_POINTS.slice(1)) {
          if (problems.length) break;
          seekAnimations(da, point);
          seekAnimations(db, point);
          problems = compareSnapshots(snapshot(da), snapshot(db), (where ? where + ', ' : '') + 'анимация на ' + Math.round(point * 100) + '%');
        }
        seekAnimations(da, 0);
        seekAnimations(db, 0);
      }
      // Состояния: :hover, :focus, :checked…
      if (!problems.length && task.states.length) {
        [da, db].forEach((d) => { addForcedRules(d); noMotion(d); });
        for (const state of task.states) {
          [da, db].forEach((d) => setState(d, state, true));
          problems = compareSnapshots(snapshot(da), snapshot(db), (where ? where + ', ' : '') + stateLabel(state));
          [da, db].forEach((d) => setState(d, state, false));
          if (problems.length) break;
        }
      }
      return problems;
    } finally {
      fa.remove();
      fb.remove();
    }
  }

  function stateLabel(state) {
    const names = { hover: 'при наведении', focus: 'в фокусе', active: 'при нажатии', 'focus-within': 'в фокусе внутри', 'focus-visible': 'в фокусе', checked: 'когда отмечено' };
    return names[state.state] + ' на ' + state.selector;
  }

  /** Сравнить CSS студента с эталоном. { ok, problems: [{ where, el, text }] } — первые расхождения. */
  async function check(task, studentCss, refCss) {
    const t = { states: [], widths: [800], ...task };
    for (const width of t.widths) {
      const problems = await compareAt(t, studentCss, refCss, width);
      if (problems.length) {
        // Сначала — размеры и положение (их видно), потом стили; не больше трёх подсказок.
        problems.sort((a, b) => Number(Boolean(b.rect)) - Number(Boolean(a.rect)));
        const seen = new Set();
        const top = problems.filter((p) => {
          const key = p.el + '|' + p.prop;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 3).map(({ where, el, text }) => ({ where, el: el || '', text }));
        return { ok: false, problems: top, total: problems.length };
      }
    }
    return { ok: true, problems: [], total: 0 };
  }

  root.CssCheck = { check, documentHtml, FRAME_HEIGHT };
})(window);
