// Живые примеры в теории предмета «Web-разработка: HTML» (src/lib/html-course/theory.js): у каждого блока
// .html-example рядом с кодом — его вид в изолированном iframe (sandbox без скриптов, CSP без внешних загрузок).
// data-view="clean" — как в браузере, "boxes" — схема коробками с подписями тег#id.class (стили /css/html-boxes.css,
// те же, что в окне практической работы).
(function () {
  const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";
  const BLOCKED = 'script, iframe, frame, object, embed, link, meta, base, style, template';
  const CONTAINERS = new Set(['div', 'header', 'nav', 'main', 'footer', 'section', 'article', 'aside', 'figure', 'details', 'address']);
  const BASE = ':root { color-scheme: light; } html, body { margin: 0; } body { padding: 12px 16px; background: #FFFFFF; }';
  const BOXES_BODY = 'body.boxes { padding: 14px; background: #FFFDF9; }';

  function labelled(html, scheme) {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll(BLOCKED).forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((el) => {
      for (const { name, value } of [...el.attributes]) {
        if (name.startsWith('on') || /^\s*javascript:/i.test(value)) el.removeAttribute(name);
      }
      if (!scheme) return;
      const tag = el.tagName.toLowerCase();
      const id = el.id.trim().split(/\s+/)[0];
      const classes = [...el.classList];
      el.setAttribute('data-t', tag);
      el.setAttribute('data-label', tag + (id ? '#' + id : '') + classes.map((c) => '.' + c).join(''));
      if (!CONTAINERS.has(tag)) el.setAttribute('data-kind', id ? 'id' : classes.length ? 'class' : 'tag');
    });
    // Сериализуем через template: его содержимое инертно, и браузер не начинает грузить картинки примера
    // со страницы (иначе img из примера даёт лишний запрос и 404 ещё до изолированного iframe).
    return template.innerHTML;
  }

  function build(boxesCss) {
    boxesCssText = boxesCss;
    document.querySelectorAll('.html-example').forEach((figure) => {
      const holder = figure.querySelector('.html-example-frame');
      if (!holder || holder.firstChild) return;
      const scheme = figure.dataset.view === 'boxes';
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', '');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.title = scheme ? 'Схема примера' : 'Пример в браузере';
      frame.srcdoc = '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        + '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">'
        + '<style>' + BASE + (scheme ? boxesCss + BOXES_BODY : '') + '</style></head>'
        + '<body' + (scheme ? ' class="boxes"' : '') + '>' + labelled(holder.dataset.html, scheme) + '</body></html>';
      holder.append(frame);
      // Для замера картинки без src: иначе теневой DOM начал бы их грузить со страницы.
      frames.push({ frame, holder, scheme, html: labelled(holder.dataset.html, scheme).replace(/\ssrc="[^"]*"/g, '') });
    });
    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    window.addEventListener('resize', () => {
      clearTimeout(fit.timer);
      fit.timer = setTimeout(fit, 150);
    });
  }

  // Высота окна — по высоте содержимого: размер документа изолированного iframe прочитать нельзя, поэтому пример
  // рисуется ещё раз в невидимом теневом DOM той же ширины с теми же стилями (стили сайта туда не проникают).
  const frames = [];
  let boxesCssText = '';
  function fit() {
    frames.forEach(({ frame, holder, scheme, html }) => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;width:' + holder.clientWidth + 'px';
      const shadow = probe.attachShadow({ mode: 'open' });
      const css = (BASE + (scheme ? boxesCssText + BOXES_BODY : '')).replace(/\bbody\b/g, '.root').replace(/:root\s*\{[^}]*\}/, '');
      shadow.innerHTML = '<style>.root { all: initial; display: block; }' + css + '</style>'
        + '<div class="root' + (scheme ? ' boxes' : '') + '">' + html + '</div>';
      document.body.append(probe);
      const height = shadow.querySelector('.root').getBoundingClientRect().height;
      probe.remove();
      frame.style.height = Math.max(140, Math.ceil(height) + 24) + 'px';
    });
  }

  const needsBoxes = document.querySelector('.html-example[data-view="boxes"]');
  if (!needsBoxes) return build('');
  fetch('/css/html-boxes.css').then((r) => (r.ok ? r.text() : '')).catch(() => '').then(build);
})();
