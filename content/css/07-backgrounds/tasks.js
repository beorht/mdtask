// Тема 7. Фон, рамки и тени. Картинки — public/img/css-course/.
const PAGE = `
<div class="banner"><h2>Летнее меню</h2></div>
<div class="stripe"></div>
<div class="rating"></div>
<div class="card">
  <img class="avatar" src="/img/css-course/avatar.svg" alt="Бариста">
  <h3>Анна, бариста</h3>
  <p>Готовит лучший флэт уайт в городе.</p>
  <button class="btn">Подписаться</button>
</div>`;

module.exports = [
  { id: 'bg-01', title: 'Фоновая картинка', description: 'Блоку .banner задайте высоту 200px и фоновую картинку /img/css-course/banner.svg.', html: PAGE, css: '.banner { height: 200px; background-image: url("/img/css-course/banner.svg"); }' },
  { id: 'bg-02', title: 'Картинка на весь блок', description: 'Блоку .banner — высота 220px, картинка /img/css-course/banner.svg на весь блок (cover) по центру, текст белым.', html: PAGE, css: '.banner { height: 220px; background-image: url("/img/css-course/banner.svg"); background-size: cover; background-position: center; color: white; }' },
  { id: 'bg-03', title: 'Звёзды рейтинга', description: 'Блоку .rating — ширина 120px и высота 24px; фон — картинка /img/css-course/icon-star.svg, повторяется только по горизонтали (repeat-x).', html: PAGE, css: '.rating { width: 120px; height: 24px; background-image: url("/img/css-course/icon-star.svg"); background-repeat: repeat-x; }' },
  { id: 'bg-04', title: 'Линейный градиент', description: 'Полосе .stripe — высота 40px и градиент слева направо от #CA2851 к #FFB173.', html: PAGE, css: '.stripe { height: 40px; background-image: linear-gradient(90deg, #CA2851, #FFB173); }', require: ['linear-gradient'] },
  { id: 'bg-05', title: 'Радиальный градиент', description: 'Блоку .banner — высота 180px и радиальный градиент кругами от #FFE3B3 в центре к #FF6766.', html: PAGE, css: '.banner { height: 180px; background-image: radial-gradient(circle, #FFE3B3, #FF6766); }', require: ['radial-gradient'] },
  { id: 'bg-06', title: 'Скруглённая карточка', description: 'Карточке .card — ширина 280px, отступ 16px, фон #FFF3E6, скругление углов 16px.', html: PAGE, css: '.card { width: 280px; padding: 16px; background-color: #FFF3E6; border-radius: 16px; }' },
  { id: 'bg-07', title: 'Круглая аватарка', description: 'Картинке .avatar — 96×96px, круг (border-radius 50%), рамка 3px solid #FFB173.', html: PAGE, css: '.avatar { width: 96px; height: 96px; border-radius: 50%; border: 3px solid #FFB173; }' },
  { id: 'bg-08', title: 'Тень карточки', description: 'Карточке .card — ширина 280px, отступ 16px, белый фон и тень 0 8px 24px rgba(0, 0, 0, 0.15).', html: PAGE, css: '.card { width: 280px; padding: 16px; background-color: white; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }' },
  { id: 'bg-09', title: 'Контур кнопки', description: 'Кнопке .btn — контур (outline) 3px dashed #CA2851 с отступом 4px (outline-offset) и скругление 8px.', html: PAGE, css: '.btn { outline: 3px dashed #CA2851; outline-offset: 4px; border-radius: 8px; }' },
  { id: 'bg-10', title: 'Профиль бариста', description: 'Как в образце: .card — ширина 300px, отступ 20px, скругление 20px, градиент сверху вниз от #FFE3B3 к #FFFFFF, тень 0 10px 30px rgba(202, 40, 81, 0.25); .avatar — 80×80, круг; .btn — фон #CA2851, белый текст, без рамки, скругление 999px, отступ 8px 18px.', html: PAGE, css: '.card { width: 300px; padding: 20px; border-radius: 20px; background-image: linear-gradient(180deg, #FFE3B3, #FFFFFF); box-shadow: 0 10px 30px rgba(202, 40, 81, 0.25); }\n.avatar { width: 80px; height: 80px; border-radius: 50%; }\n.btn { background-color: #CA2851; color: white; border: 0; border-radius: 999px; padding: 8px 18px; }' },
];
