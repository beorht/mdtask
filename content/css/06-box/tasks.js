// Тема 6. Блочная модель.
const CARDS = `
<div class="card">
  <h3>Эспрессо</h3>
  <p>Крепкий и ароматный.</p>
</div>
<div class="card">
  <h3>Капучино</h3>
  <p>С нежной молочной пеной.</p>
</div>
<button class="btn">Заказать</button>
<button class="btn">В избранное</button>`;

module.exports = [
  { id: 'box-01', title: 'Внутренний отступ', description: 'Карточкам .card задайте фон #FFF3E6 и внутренний отступ 16px со всех сторон.', html: CARDS, css: '.card { background-color: #FFF3E6; padding: 16px; }' },
  { id: 'box-02', title: 'Рамка', description: 'Карточкам — рамка 2px solid #FFB173.', html: CARDS, css: '.card { border: 2px solid #FFB173; }' },
  { id: 'box-03', title: 'Расстояние между карточками', description: 'Карточкам — фон #FFF3E6 и внешний отступ снизу 24px.', html: CARDS, css: '.card { background-color: #FFF3E6; margin-bottom: 24px; }' },
  { id: 'box-04', title: 'Отступы кнопки', description: 'Кнопкам .btn — внутренние отступы 10px сверху и снизу, 24px слева и справа; рамка 0; фон #CA2851; белый текст.', html: CARDS, css: '.btn { padding: 10px 24px; border: 0; background-color: #CA2851; color: white; }' },
  { id: 'box-05', title: 'Точная ширина', description: 'Карточки ровно 300px в ширину вместе с отступом 20px и рамкой 4px solid #1F3F66: используйте box-sizing: border-box.', html: CARDS, css: '.card { width: 300px; padding: 20px; border: 4px solid #1F3F66; box-sizing: border-box; }', require: ['box-sizing: border-box'] },
  { id: 'box-06', title: 'По центру', description: 'Карточкам — ширина 320px, фон #FFF3E6, и поставьте их по центру страницы (margin с auto).', html: CARDS, css: '.card { width: 320px; background-color: #FFF3E6; margin: 0 auto; }', require: ['auto'] },
  { id: 'box-07', title: 'Не шире и не ниже', description: 'Карточкам — не шире 400px (max-width), не ниже 140px (min-height), фон #E6EEF8.', html: CARDS, css: '.card { max-width: 400px; min-height: 140px; background-color: #E6EEF8; }' },
  { id: 'box-08', title: 'Убрать отступы заголовка', description: 'У заголовков h3 внутри карточек уберите внешний отступ сверху (margin-top: 0) и сделайте снизу 4px. Карточкам — фон #FFF3E6 и отступ 12px.', html: CARDS, css: '.card { background-color: #FFF3E6; padding: 12px; }\n.card h3 { margin-top: 0; margin-bottom: 4px; }' },
  { id: 'box-09', title: 'Одинаковые кнопки', description: 'Кнопки .btn — ширина 180px, высота 44px, рамка 2px solid #1C1A1B, фон белый, внешний отступ справа 12px.', html: CARDS, css: '.btn { width: 180px; height: 44px; border: 2px solid #1C1A1B; background-color: white; margin-right: 12px; }' },
  { id: 'box-10', title: 'Меню-карточки', description: 'Как в образце: карточки — ширина 360px вместе с отступами (border-box), отступ 16px 20px, рамка снизу 4px solid #CA2851, фон #FFF8EE, отступ между карточками 16px, по центру; у h3 — margin 0 0 6px.', html: CARDS, css: '.card { box-sizing: border-box; width: 360px; padding: 16px 20px; border-bottom: 4px solid #CA2851; background-color: #FFF8EE; margin: 0 auto 16px; }\n.card h3 { margin: 0 0 6px; }' },
];
