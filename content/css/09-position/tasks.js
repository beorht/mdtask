// Тема 9. Позиционирование.
const CARD = `
<div class="card">
  <span class="badge">Новинка</span>
  <img class="photo" src="/img/css-course/photo-1.svg" alt="">
  <h3>Малиновый тарт</h3>
  <p>Песочное тесто, крем и свежая малина.</p>
  <button class="like">♥</button>
</div>`;
const PAGE = `
<header class="top">Кафе «Ромашка»</header>
<nav class="tabs">Завтраки · Обеды · Десерты</nav>
<main class="content">
  <p>Раздел с меню.</p>
  <div class="layers"><div class="a">Акция</div><div class="b">Новинка</div></div>
  <div class="hint-wrap"><button class="btn">Заказать</button><span class="hint">Доставка за 30 минут</span></div>
</main>`;

module.exports = [
  { id: 'position-01', title: 'Сдвиг от своего места', description: 'Сдвиньте заголовок h3 карточки на 10px вниз и 20px вправо от его обычного места (position: relative).', html: CARD, css: '.card h3 { position: relative; top: 10px; left: 20px; }', require: ['position: relative'] },
  { id: 'position-02', title: 'Значок в углу', description: 'Карточке — position: relative и ширина 300px. Значок .badge — в правом верхнем углу карточки (12px от верха и от правого края), фон #CA2851, белый текст, отступ 4px 10px.', html: CARD, css: '.card { position: relative; width: 300px; }\n.badge { position: absolute; top: 12px; right: 12px; background-color: #CA2851; color: white; padding: 4px 10px; }', require: ['position: absolute'] },
  { id: 'position-03', title: 'Кнопка «нравится» на фото', description: 'Карточка — relative, ширина 300px; картинка — ширина 100%. Кнопку .like поставьте в левый нижний угол картинки: absolute, left 12px, top 180px; размер 40×40, круглая, белый фон, без рамки.', html: CARD, css: '.card { position: relative; width: 300px; }\n.photo { width: 100%; }\n.like { position: absolute; left: 12px; top: 180px; width: 40px; height: 40px; border-radius: 50%; background-color: white; border: 0; }', require: ['position: absolute'] },
  { id: 'position-04', title: 'Наложение и z-index', description: 'Блок .layers — relative, высота 140px. Блоки .a и .b — absolute, 160×90, отступ 10px; .a — фон #CA2851, top 0, left 0; .b — фон #1F3F66, top 40px, left 80px, белый текст у обоих. Сделайте так, чтобы .a оказался поверх .b (z-index).', html: PAGE, css: '.layers { position: relative; height: 140px; }\n.a, .b { position: absolute; width: 160px; height: 90px; padding: 10px; color: white; }\n.a { background-color: #CA2851; top: 0; left: 0; z-index: 2; }\n.b { background-color: #1F3F66; top: 40px; left: 80px; z-index: 1; }', require: ['z-index'] },
  { id: 'position-05', title: 'Подсказка над кнопкой', description: 'Обёртка .hint-wrap — relative, inline-block. Подсказка .hint — absolute, над кнопкой: bottom 100%, left 0; фон #1C1A1B, цвет #FFE3B3, отступ 6px 10px, white-space: nowrap.', html: PAGE, css: '.hint-wrap { position: relative; display: inline-block; }\n.hint { position: absolute; bottom: 100%; left: 0; background-color: #1C1A1B; color: #FFE3B3; padding: 6px 10px; white-space: nowrap; }', require: ['position: absolute'] },
  { id: 'position-06', title: 'Затемнение на фото', description: 'Карточка — relative, ширина 300px; картинка — ширина 100%, display: block. Значок .badge растяните на всю карточку (absolute, inset: 0) с фоном rgba(0, 0, 0, 0.4) и белым текстом.', html: CARD, css: '.card { position: relative; width: 300px; }\n.photo { width: 100%; display: block; }\n.badge { position: absolute; inset: 0; background-color: rgba(0, 0, 0, 0.4); color: white; }', require: ['position: absolute'] },
  { id: 'position-07', title: 'Шапка всегда видна', description: 'Шапку .top закрепите вверху окна: fixed, top 0, left 0, right 0, высота 50px, фон #1C1A1B, цвет #FFE3B3. Содержимому страницы (body) — отступ сверху 60px, чтобы шапка его не закрывала.', html: PAGE, css: 'body { padding-top: 60px; }\n.top { position: fixed; top: 0; left: 0; right: 0; height: 50px; background-color: #1C1A1B; color: #FFE3B3; }', require: ['position: fixed'] },
  { id: 'position-08', title: 'Прилипающие вкладки', description: 'Вкладки .tabs сделайте «прилипающими» к верху окна при прокрутке (sticky, top 0), фон #FFE3B3, отступ 10px.', html: PAGE, css: '.tabs { position: sticky; top: 0; background-color: #FFE3B3; padding: 10px; }', require: ['position: sticky'] },
  { id: 'position-09', title: 'Значок по центру фото', description: 'Карточка — relative, ширина 300px; картинка — ширина 100%. Значок .badge поставьте точно по центру карточки: absolute, top 50%, left 50%, transform: translate(-50%, -50%); фон белый, отступ 6px 14px.', html: CARD, css: '.card { position: relative; width: 300px; }\n.photo { width: 100%; }\n.badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 6px 14px; }', require: ['position: absolute'] },
];
