// Тема 19. Итоговая работа: лендинг кафе по частям и целиком.
const PAGE = `
<header class="site-header">
  <img class="logo" src="/img/css-course/logo.svg" alt="Кафе «Ромашка»">
  <nav class="nav"><a href="#menu">Меню</a><a href="#about">О нас</a><a href="#review">Отзывы</a><a href="#order">Контакты</a></nav>
  <a class="cta" href="#order">Заказать</a>
</header>
<section class="hero">
  <h1 class="hero__title">Кофе, ради которого просыпаются</h1>
  <p class="hero__text">Свежая обжарка, домашняя выпечка и завтраки весь день — в двух шагах от парка.</p>
  <a class="btn" href="#menu">Смотреть меню</a>
</section>
<section class="features" id="about">
  <div class="feature"><span class="feature__icon">☕</span><h3>Свежая обжарка</h3><p>Обжариваем зерно каждую неделю.</p></div>
  <div class="feature"><span class="feature__icon">🥐</span><h3>Своя выпечка</h3><p>Круассаны пекутся с 6 утра.</p></div>
  <div class="feature"><span class="feature__icon">🌿</span><h3>Веранда</h3><p>Летом — завтраки на свежем воздухе.</p></div>
</section>
<section class="menu" id="menu">
  <h2>Меню</h2>
  <div class="menu__grid">
    ${[['Капучино', 220], ['Раф', 290], ['Матча-латте', 310], ['Круассан', 180], ['Чизкейк', 350], ['Тарт', 390]].map(([t, p], i) => `<article class="dish"><img src="/img/css-course/photo-${i + 1}.svg" alt=""><h3>${t}</h3><p class="dish__price">${p} ₽</p></article>`).join('\n    ')}
  </div>
</section>
<blockquote class="review" id="review"><p>Лучший флэт уайт в городе, а чизкейк — как у бабушки. Приходим каждое воскресенье!</p><cite>Анна, гость кафе</cite></blockquote>
<form class="order" id="order">
  <h2>Заказ столика</h2>
  <input placeholder="Имя"><input placeholder="Телефон"><button>Отправить</button>
</form>
<footer class="site-footer"><p>© 2026 Кафе «Ромашка»</p><p>Ташкент, ул. Парковая, 1</p></footer>`;

const HEADER = 'body { margin: 0; }\n.site-header { display: flex; justify-content: space-between; align-items: center; background-color: #1C1A1B; padding: 12px 24px; }\n.nav { display: flex; gap: 16px; }\n.nav a { color: #FFE3B3; text-decoration: none; }\n.cta { background-color: #CA2851; color: white; padding: 8px 16px; border-radius: 999px; text-decoration: none; }';
const HERO = '.hero { background-image: linear-gradient(135deg, #CA2851, #FFB173); color: white; text-align: center; padding: 80px 24px; }\n.hero__title { font-size: 48px; margin: 0 0 12px; }\n.hero__text { font-size: 18px; margin: 0 0 24px; }\n.btn { display: inline-block; background-color: white; color: #CA2851; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 700; }';
const FEATURES = '.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 40px 24px; }\n.feature { text-align: center; }\n.feature__icon { font-size: 40px; }';
const MENU = '.menu { padding: 40px 24px; background-color: #FFF8EE; }\n.menu h2 { text-align: center; margin-top: 0; }\n.menu__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }\n.dish { background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }\n.dish img { display: block; width: 100%; }\n.dish h3, .dish p { margin: 8px 12px; }\n.dish__price { color: #CA2851; font-weight: 700; }';
const REVIEW = '.review { max-width: 600px; margin: 40px auto; padding: 24px; background-color: #FFF3E6; border-left: 6px solid #FFB173; font-style: italic; font-size: 18px; }\n.review p { margin: 0; }\n.review cite { display: block; margin-top: 8px; font-style: normal; font-weight: 700; }';
const ORDER = '.order { max-width: 420px; margin: 40px auto; display: grid; gap: 12px; padding: 0 24px; }\n.order h2 { margin: 0; text-align: center; }\n.order input, .order button { font: inherit; padding: 10px 12px; border-radius: 8px; }\n.order input { border: 1px solid #CCCCCC; }\n.order button { border: 0; background-color: #1C1A1B; color: #FFE3B3; }';
const FOOTER = '.site-footer { display: flex; justify-content: space-between; background-color: #1C1A1B; color: #FFE3B3; padding: 16px 24px; }\n.site-footer p { margin: 0; }';
const MOBILE = '@media (max-width: 600px) {\n  .site-header { flex-wrap: wrap; gap: 8px; }\n  .hero__title { font-size: 32px; }\n  .features { grid-template-columns: 1fr; }\n  .site-footer { flex-direction: column; gap: 4px; }\n}';

module.exports = [
  { id: 'final-01', title: 'Шапка', description: 'body — без внешнего отступа. Шапка .site-header — flex, края раздвинуты, по центру по вертикали, фон #1C1A1B, отступ 12px 24px; меню .nav — flex с промежутком 16px, ссылки — цвет #FFE3B3 без подчёркивания; кнопка .cta — фон #CA2851, белый текст, отступ 8px 16px, скругление 999px, без подчёркивания.', html: PAGE, css: HEADER, require: ['display: flex'] },
  { id: 'final-02', title: 'Первый экран', description: '.hero — градиент 135deg от #CA2851 к #FFB173, белый текст по центру, отступ 80px 24px; заголовок .hero__title — 48px, отступ 0 0 12px; текст .hero__text — 18px, отступ 0 0 24px; кнопка .btn — inline-block, белый фон, цвет #CA2851, отступ 12px 24px, скругление 999px, без подчёркивания, жирная (700).', html: PAGE, css: HERO, require: ['linear-gradient'] },
  { id: 'final-03', title: 'Преимущества', description: '.features — сетка из 3 равных колонок, промежуток 24px, отступ 40px 24px; .feature — текст по центру; значок .feature__icon — 40px.', html: PAGE, css: FEATURES, require: ['display: grid'] },
  { id: 'final-04', title: 'Меню', description: '.menu — отступ 40px 24px, фон #FFF8EE; h2 — по центру, без отступа сверху; .menu__grid — сетка repeat(auto-fill, minmax(200px, 1fr)), промежуток 16px; .dish — белый фон, скругление 12px, overflow hidden, тень 0 4px 12px rgba(0, 0, 0, 0.08); картинка — блочная, ширина 100%; h3 и p блюда — отступ 8px 12px; цена .dish__price — #CA2851, жирная.', html: PAGE, css: MENU, require: ['auto-fill'] },
  { id: 'final-05', title: 'Отзыв', description: '.review — не шире 600px, по центру с отступом 40px сверху и снизу, внутренний отступ 24px, фон #FFF3E6, полоса слева 6px solid #FFB173, курсив, 18px; абзац — без отступов; подпись cite — блочная, отступ сверху 8px, обычное начертание, жирная.', html: PAGE, css: REVIEW },
  { id: 'final-06', title: 'Форма заказа', description: '.order — не шире 420px, по центру (40px сверху и снизу), сетка с промежутком 12px, отступ 0 24px; h2 — без отступов, по центру; поля и кнопка — шрифт страницы, отступ 10px 12px, скругление 8px; поля — рамка 1px solid #CCCCCC; кнопка — без рамки, фон #1C1A1B, цвет #FFE3B3.', html: PAGE, css: ORDER, require: ['display: grid'] },
  { id: 'final-07', title: 'Подвал', description: '.site-footer — flex, края раздвинуты, фон #1C1A1B, цвет #FFE3B3, отступ 16px 24px; абзацы — без отступов.', html: PAGE, css: FOOTER },
  { id: 'final-08', title: 'Вся страница', description: 'Соберите стили заданий 1–7 в одну страницу и добавьте адаптивность: до 600px шапка переносит строки (flex-wrap: wrap, промежуток 8px), заголовок .hero__title — 32px, преимущества — в одну колонку, подвал — колонкой с промежутком 4px. Проверяется на телефоне и компьютере.', html: PAGE, widths: [375, 1200], css: [HEADER, HERO, FEATURES, MENU, REVIEW, ORDER, FOOTER, MOBILE].join('\n'), require: ['@media'] },
];
