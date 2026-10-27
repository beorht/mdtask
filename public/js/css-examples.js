// Живые примеры в теории предмета «Web-разработка: CSS» (src/lib/css-course/theory.js): у каждого блока
// .css-example рядом с кодом — его вид в iframe. Скрипты в примере не выполняются (sandbox без allow-scripts),
// внешние загрузки запрещены (CSP); allow-same-origin нужен только чтобы подогнать высоту окна под содержимое.
(function () {
  const CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:";
  const BASE = ':root { color-scheme: light; } html { font-family: "Open Sans", sans-serif; } body { margin: 0; padding: 12px 16px; background: #FFFFFF; color: #222; }';

  function fit(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.documentElement) return;
      // Не ниже содержимого; выше — растягивается до высоты кода слева (css-course.css).
      frame.style.minHeight = Math.min(640, Math.max(90, doc.documentElement.scrollHeight)) + 'px';
    } catch (e) { /* без доступа — высота по умолчанию */ }
  }

  document.querySelectorAll('.css-example-frame').forEach((holder) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.title = 'Пример в браузере';
    frame.srcdoc = '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
      + '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">'
      + '<link rel="stylesheet" href="/vendor/fonts/fonts.css">'
      + '<style>' + BASE + '</style><style>' + holder.dataset.css.replace(/<\/style/gi, '') + '</style></head>'
      + '<body>' + holder.dataset.html.replace(/<script[\s\S]*?<\/script>/gi, '') + '</body></html>';
    frame.addEventListener('load', () => {
      fit(frame);
      const doc = frame.contentDocument;
      if (doc && doc.fonts) doc.fonts.ready.then(() => fit(frame));
      setTimeout(() => fit(frame), 400);
    });
    holder.append(frame);
  });
})();
