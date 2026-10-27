// Тема 16. Переходы, трансформации и анимации. Переходы проверяются по свойствам transition-* и по виду в состоянии
// (states), анимации — по кадрам в нескольких точках (public/js/css-check.js). Оформление в :where (нулевой вес).
const DECOR = `<style>
  :where(body) { font-family: "Open Sans", sans-serif; padding: 24px; }
  :where(.btn) { font: inherit; padding: 10px 20px; border: 0; border-radius: 8px; background: #CA2851; color: white; }
  :where(.card) { width: 220px; padding: 16px; margin: 16px 0; background: #FFF3E6; border-radius: 12px; }
  :where(.frame) { width: 240px; height: 160px; margin: 16px 0; }
  :where(.pic) { display: block; width: 100%; height: 100%; object-fit: cover; }
  :where(.icon) { font-size: 28px; color: #CA2851; }
  :where(.link) { color: #1F3F66; font-size: 18px; }
  :where(.box) { width: 200px; padding: 16px; margin: 16px 0; background: #FFE3B3; }
  :where(.spinner) { width: 40px; height: 40px; border: 4px solid #EEEEEE; border-top-color: #CA2851; border-radius: 50%; }
  :where(.dot) { display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: #FF6766; margin: 12px; }
  :where(.flip) { width: 200px; height: 120px; margin: 16px 0; }
  :where(.inner) { position: relative; width: 100%; height: 100%; }
  :where(.front, .back) { position: absolute; inset: 0; display: grid; place-items: center; backface-visibility: hidden; }
  :where(.front) { background: #FFB173; }
  :where(.back) { background: #1F3F66; color: white; }
</style>`;
const PAGE = `${DECOR}
<button class="btn">Заказать</button>
<div class="card">Карточка десерта</div>
<div class="frame"><img class="pic" src="/img/css-course/photo-1.svg" alt=""></div>
<span class="icon">✚</span>
<p><a class="link" href="#">Подробнее о меню</a></p>
<div class="box">Новинка недели</div>
<div class="spinner"></div>
<span class="dot"></span>
<div class="flip"><div class="inner"><div class="front">Лицо</div><div class="back">Оборот</div></div></div>`;
const hover = (selector) => [{ selector, state: 'hover' }];

module.exports = [
  { id: 'motion-01', title: 'Плавная смена цвета', description: 'При наведении на .btn фон плавно меняется на #1C1A1B за 0.3s (transition: background-color 0.3s).', html: PAGE, css: '.btn { transition: background-color 0.3s; }\n.btn:hover { background-color: #1C1A1B; }', states: hover('.btn'), require: ['transition', ':hover'] },
  { id: 'motion-02', title: 'Два свойства — разная длительность', description: 'При наведении на .btn фон становится #FFE3B3 (переход 0.3s), а цвет текста — #1C1A1B (переход 0.6s).', html: PAGE, css: '.btn { transition: background-color 0.3s, color 0.6s; }\n.btn:hover { background-color: #FFE3B3; color: #1C1A1B; }', states: hover('.btn'), require: ['transition'] },
  { id: 'motion-03', title: 'Задержка перехода', description: 'При наведении карточка .card поднимается на 8px (translateY(-8px)); переход transform 0.4s с задержкой 0.2s.', html: PAGE, css: '.card { transition: transform 0.4s 0.2s; }\n.card:hover { transform: translateY(-8px); }', states: hover('.card'), require: ['transition', 'translatey('] },
  { id: 'motion-04', title: 'Характер движения', description: 'При наведении карточка увеличивается до scale(1.05); переход transform 0.5s ease-in-out.', html: PAGE, css: '.card { transition: transform 0.5s ease-in-out; }\n.card:hover { transform: scale(1.05); }', states: hover('.card'), require: ['transition', 'scale('] },
  { id: 'motion-05', title: 'Карточка «всплывает»', description: 'При наведении карточка поднимается на 6px и получает тень 0 12px 24px rgba(0, 0, 0, 0.18); переход transform и box-shadow — по 0.3s.', html: PAGE, css: '.card { transition: transform 0.3s, box-shadow 0.3s; }\n.card:hover { transform: translateY(-6px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18); }', states: hover('.card'), require: ['transition'] },
  { id: 'motion-06', title: 'Увеличение фото в рамке', description: 'Рамке .frame — overflow: hidden и скругление 12px. При наведении на рамку картинка .pic увеличивается до scale(1.15) за 0.5s, не вылезая за рамку.', html: PAGE, css: '.frame { overflow: hidden; border-radius: 12px; }\n.pic { transition: transform 0.5s; }\n.frame:hover .pic { transform: scale(1.15); }', states: hover('.frame'), require: ['overflow', 'scale('] },
  { id: 'motion-07', title: 'Поворот значка', description: 'Значок .icon — inline-block, переход transform 0.3s; при наведении поворачивается на 45deg.', html: PAGE, css: '.icon { display: inline-block; transition: transform 0.3s; }\n.icon:hover { transform: rotate(45deg); }', states: hover('.icon'), require: ['rotate('] },
  { id: 'motion-08', title: 'Точка трансформации', description: 'При наведении карточка поворачивается на -6deg вокруг левого нижнего угла (transform-origin: left bottom); переход 0.3s.', html: PAGE, css: '.card { transform-origin: left bottom; transition: transform 0.3s; }\n.card:hover { transform: rotate(-6deg); }', states: hover('.card'), require: ['transform-origin'] },
  { id: 'motion-09', title: 'Несколько трансформаций', description: 'При наведении карточка сдвигается на 20px вправо и поворачивается на 3deg — одним transform; переход 0.4s.', html: PAGE, css: '.card { transition: transform 0.4s; }\n.card:hover { transform: translateX(20px) rotate(3deg); }', states: hover('.card'), require: ['translatex(', 'rotate('] },
  { id: 'motion-10', title: 'Растущее подчёркивание', description: 'Ссылка .link — без подчёркивания, position: relative. Под ней ::after: content "", position: absolute, left 0, bottom -2px, высота 2px, ширина 0, фон #CA2851, переход width 0.3s. При наведении ширина ::after — 100%.', html: PAGE, css: '.link { text-decoration: none; position: relative; }\n.link::after { content: ""; position: absolute; left: 0; bottom: -2px; height: 2px; width: 0; background-color: #CA2851; transition: width 0.3s; }\n.link:hover::after { width: 100%; }', states: hover('.link'), require: ['::after', 'transition'] },
  { id: 'motion-11', title: 'Кнопка нажимается', description: 'Кнопке .btn — тень 0 4px 0 #8A1C38; при нажатии (:active) она опускается на 2px (translateY(2px)), а тень становится 0 2px 0 #8A1C38.', html: PAGE, css: '.btn { box-shadow: 0 4px 0 #8A1C38; }\n.btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #8A1C38; }', states: [{ selector: '.btn', state: 'active' }], require: [':active'] },
  { id: 'motion-12', title: 'Появление блока', description: 'Блок .box появляется: анимация 1s ease-out с fill-mode both, кадры — от opacity 0 и translateY(20px) к opacity 1 и translateY(0).', html: PAGE, css: '@keyframes appear { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }\n.box { animation: appear 1s ease-out both; }', require: ['@keyframes', 'animation'] },
  { id: 'motion-13', title: 'Индикатор загрузки', description: 'Блок .spinner бесконечно вращается: полный оборот (rotate(360deg)) за 1s, равномерно (linear).', html: PAGE, css: '@keyframes spin { to { transform: rotate(360deg); } }\n.spinner { animation: spin 1s linear infinite; }', require: ['@keyframes', 'infinite'] },
  { id: 'motion-14', title: 'Пульс', description: 'Точка .dot бесконечно «пульсирует»: за 1.5s ease-in-out масштаб 1 → 1.4 (на 50%) → 1.', html: PAGE, css: '@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }\n.dot { animation: pulse 1.5s ease-in-out infinite; }', require: ['@keyframes'] },
  { id: 'motion-15', title: 'Три кадра цвета', description: 'Блок .box бесконечно меняет фон за 3s linear: 0% — #FFE3B3, 50% — #FF6766, 100% — #FFE3B3.', html: PAGE, css: '@keyframes glow { 0% { background-color: #FFE3B3; } 50% { background-color: #FF6766; } 100% { background-color: #FFE3B3; } }\n.box { animation: glow 3s linear infinite; }', require: ['@keyframes'] },
  { id: 'motion-16', title: 'Задержка и повторы', description: 'Значок .icon (inline-block) качается: кадры rotate(-10deg) → rotate(10deg), длительность 0.4s, задержка 0.5s, 6 повторов, туда и обратно (alternate).', html: PAGE, css: '@keyframes swing { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }\n.icon { display: inline-block; animation: swing 0.4s 0.5s 6 alternate; }', require: ['@keyframes', 'alternate'] },
  { id: 'motion-17', title: 'Переворачивающаяся карточка', description: 'Контейнеру .flip — perspective 600px. У .inner — transform-style: preserve-3d и переход transform 0.6s; при наведении на .flip — .inner поворачивается rotateY(180deg). Оборот .back заранее повёрнут на rotateY(180deg).', html: PAGE, css: '.flip { perspective: 600px; }\n.inner { transform-style: preserve-3d; transition: transform 0.6s; }\n.flip:hover .inner { transform: rotateY(180deg); }\n.back { transform: rotateY(180deg); }', states: hover('.flip'), require: ['rotatey('] },
  { id: 'motion-18', title: 'Меньше движения', description: 'Индикатор .spinner вращается, как в задании 13. Но если у человека включено «уменьшить движение», анимации нет: добавьте @media (prefers-reduced-motion: reduce) с animation: none.', html: PAGE, css: '@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }\n@keyframes spin { to { transform: rotate(360deg); } }\n.spinner { animation: spin 1s linear infinite; }', require: ['@keyframes', 'prefers-reduced-motion'] },
];
